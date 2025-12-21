import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function decrypt(encryptedBase64: string, key: string) {
    const encoder = new TextEncoder();
    const encryptedData = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const iv = encryptedData.slice(0, 12);
    const data = encryptedData.slice(12);
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(key.padEnd(32, '0').substring(0, 32)),
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    );
    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        data
    );
    return new TextDecoder().decode(decrypted);
}

// Helper to encrypt (for token refresh storage)
async function encrypt(text: string, key: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(key.padEnd(32, '0').substring(0, 32)),
        { name: "AES-GCM" },
        false,
        ["encrypt"]
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        data
    );
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const body = await req.json();
        const { receipt_id } = body;
        const authHeader = req.headers.get('Authorization');

        if (!receipt_id || !authHeader) {
            throw new Error('Missing receipt_id or authorization header');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Identify User
        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (authError || !user) throw new Error('Unauthorized');

        // 2. Fetch Receipt & Items
        const { data: receipt, error: rError } = await supabase.from('receipts').select('*, receipt_items(*)').eq('id', receipt_id).single();
        if (rError || !receipt) throw new Error('Receipt not found');

        // 3. Fetch Tokens
        const { data: tokens, error: tError } = await supabase.from('integration_tokens').select('*').eq('user_id', user.id).eq('provider', 'exact_online').single();
        if (tError || !tokens) throw new Error('Exact Online not connected. Please connect in Profile.');

        const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
        if (!encryptionKey) throw new Error('Internal Server Error: ENCRYPTION_KEY not configured.');
        let accessToken = await decrypt(tokens.access_token_encrypted, encryptionKey);
        const refreshToken = await decrypt(tokens.refresh_token_encrypted, encryptionKey);

        // 4. Token Refresh Logic
        if (tokens.expires_at < (Date.now() / 1000) + 60) {
            console.log('Refreshing Exact Token...');
            const refreshResponse = await fetch('https://start.exactonline.nl/api/oauth2/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                    client_id: Deno.env.get('EXACT_CLIENT_ID')!,
                    client_secret: Deno.env.get('EXACT_CLIENT_SECRET')!,
                })
            });

            if (refreshResponse.ok) {
                const newTokens = await refreshResponse.json();
                accessToken = newTokens.access_token;
                const encryptedAccess = await encrypt(newTokens.access_token, encryptionKey);
                const encryptedRefresh = await encrypt(newTokens.refresh_token, encryptionKey);
                const expiresAt = Math.floor(Date.now() / 1000) + newTokens.expires_in;

                await supabase.from('integration_tokens').update({
                    access_token_encrypted: encryptedAccess,
                    refresh_token_encrypted: encryptedRefresh,
                    expires_at: expiresAt
                }).eq('id', tokens.id);
            } else {
                throw new Error('Exact Token Refresh failed. Please reconnect.');
            }
        }

        // 5. Get Division
        const meRes = await fetch('https://start.exactonline.nl/api/v1/current/Me?$select=CurrentDivision', {
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
        });
        const meData = await meRes.json();
        const division = meData.d.results[0].CurrentDivision;

        // 6. Download Receipt Image
        const { data: imageBlob } = await supabase.storage.from('receipts').download(receipt.image_path);
        const arrayBuffer = await imageBlob!.arrayBuffer();
        const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        // 7. Create Document in Exact
        const docRes = await fetch(`https://start.exactonline.nl/api/v1/${division}/documents/Documents`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ Type: 20, Subject: `Bon: ${receipt.merchant_name}` })
        });
        const docData = await docRes.json();
        const documentId = docData.d.ID;

        // 8. Upload Attachment
        await fetch(`https://start.exactonline.nl/api/v1/${division}/documents/DocumentAttachments`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                Document: documentId,
                Attachment: base64Image,
                FileName: `receipt-${receipt_id}.jpg`
            })
        });

        // 9. Create Purchase Entry (Simplified for POC)
        // Note: For a real app, you need to map Supplier and GLAccount GUIDs correctly.
        // Here we assume some default or searched GUIDs based on metadata.
        // For the POC, we'll use placeholders if GUIDs aren't in metadata.

        const purchaseEntry = {
            Journal: "70", // Default Purchase Journal
            Supplier: receipt.supplier_guid || "00000000-0000-0000-0000-000000000000",
            Document: documentId,
            EntryDate: receipt.transaction_date,
            Description: `EasyAccounting: ${receipt.merchant_name}`,
            PaymentCondition: "K", // Unapproved
            PurchaseEntryLines: receipt.receipt_items.map((item: any) => ({
                Description: item.description,
                AmountDC: item.total_price,
                AmountFC: item.total_price,
                GLAccount: item.rgs_guid || "00000000-0000-0000-0000-000000000000",
                Division: division
            }))
        };

        const entryRes = await fetch(`https://start.exactonline.nl/api/v1/${division}/purchaseentry/PurchaseEntries`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(purchaseEntry)
        });

        if (!entryRes.ok) {
            const err = await entryRes.json();
            throw new Error(`Exact Entry Error: ${JSON.stringify(err)}`);
        }

        // 10. Finalize local status
        await supabase.from('receipts').update({ is_synced: true }).eq('id', receipt_id);

        return new Response(JSON.stringify({ success: true, message: 'Receipt synced to Exact Online' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Sync Error:', error.message);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
