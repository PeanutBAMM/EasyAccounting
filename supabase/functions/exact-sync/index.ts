import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { generateUBL } from './ublGenerator.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function decrypt(encryptedBase64: string, key: string) {
    const encoder = new TextEncoder();
    const data = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(key.padEnd(32, '0').substring(0, 32)),
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    );
    const iv = data.slice(0, 12);
    const encrypted = data.slice(12);
    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        encrypted
    );
    return new TextDecoder().decode(decrypted);
}

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

        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (authError || !user) throw new Error('Unauthorized');

        const { data: receipt, error: rError } = await supabase.from('receipts').select('*, receipt_items(*)').eq('id', receipt_id).single();
        if (rError || !receipt) throw new Error('Receipt not found');

        const { data: tokens, error: tError } = await supabase.from('integration_tokens').select('*').eq('user_id', user.id).eq('provider', 'exact_online').single();
        if (tError || !tokens) throw new Error('Exact Online not connected.');

        const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
        if (!encryptionKey) throw new Error('Encryption key missing');

        let accessToken = await decrypt(tokens.access_token_encrypted, encryptionKey);

        // --- Token Refresh Logic ---
        const now = Math.floor(Date.now() / 1000);
        if (tokens.expires_at <= now + 60) {
            console.log('🔄 Token expired, refreshing...');
            const refreshToken = await decrypt(tokens.refresh_token_encrypted, encryptionKey);
            const clientId = Deno.env.get('EXACT_CLIENT_ID');
            const clientSecret = Deno.env.get('EXACT_CLIENT_SECRET');

            const refreshRes = await fetch('https://start.exactonline.nl/api/oauth2/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                    client_id: clientId!,
                    client_secret: clientSecret!
                })
            });

            if (!refreshRes.ok) throw new Error('Refresh failed');
            const newTokens = await refreshRes.json();
            accessToken = newTokens.access_token;

            await supabase.from('integration_tokens').update({
                access_token_encrypted: await encrypt(newTokens.access_token, encryptionKey),
                refresh_token_encrypted: await encrypt(newTokens.refresh_token, encryptionKey),
                expires_at: now + newTokens.expires_in,
                updated_at: new Date().toISOString()
            }).eq('id', tokens.id);
        }

        const meRes = await fetch('https://start.exactonline.nl/api/v1/current/Me?$select=CurrentDivision', {
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
        });
        const meData = await meRes.json();
        const division = meData.d.results[0].CurrentDivision;

        const { data: imageBlob } = await supabase.storage.from('receipts').download(receipt.image_path);
        const arrayBuffer = await imageBlob!.arrayBuffer();
        const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        const ublXml = generateUBL(receipt, receipt.receipt_items);
        const base64Ubl = btoa(ublXml);

        const docRes = await fetch(`https://start.exactonline.nl/api/v1/${division}/documents/Documents`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                Type: 181,
                Subject: `EasyAccounting Compliance: ${receipt.merchant_name || 'Bon'}`,
                DocumentDate: receipt.transaction_date || new Date().toISOString().split('T')[0]
            })
        });

        if (!docRes.ok) throw new Error(`Exact Doc Error: ${await docRes.text()}`);
        const docData = await docRes.json();
        const documentId = docData.d.ID;

        await Promise.all([
            fetch(`https://start.exactonline.nl/api/v1/${division}/documents/DocumentAttachments`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ Document: documentId, Attachment: base64Image, FileName: 'bon.jpg' })
            }),
            fetch(`https://start.exactonline.nl/api/v1/${division}/documents/DocumentAttachments`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ Document: documentId, Attachment: base64Ubl, FileName: 'factuur.xml' })
            })
        ]);

        await supabase.from('receipts').update({
            is_synced: true,
            synced_at: new Date().toISOString()
        }).eq('id', receipt_id);

        return new Response(JSON.stringify({ success: true, message: 'Sync via SI-UBL 2.0 (Inbox) geslaagd!' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Exact Sync Error:', error.message);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
