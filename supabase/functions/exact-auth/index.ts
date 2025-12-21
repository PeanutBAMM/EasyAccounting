import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple encryption helper for POC (Ideally use Supabase Vault)
// Using a fixed key from environment variables
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
    const { method, url } = req;
    const urlObj = new URL(url);
    const path = urlObj.pathname.split('/').pop();

    // Handle CORS preflight
    if (method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const clientId = Deno.env.get('EXACT_CLIENT_ID');
    const clientSecret = Deno.env.get('EXACT_CLIENT_SECRET');
    const redirectUri = Deno.env.get('EXACT_REDIRECT_URI'); // This function's URL/callback
    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');

    if (!clientId || !clientSecret || !redirectUri || !encryptionKey) {
        return new Response(
            JSON.stringify({ error: 'Edge Function environment not fully configured (Missing Exact IDs or ENCRYPTION_KEY)' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // --- ROUTE: LOGIN ---
    if (path === 'login' || urlObj.searchParams.has('login')) {
        const authUrl = `https://start.exactonline.nl/api/oauth2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&force_login=1`;
        return Response.redirect(authUrl, 302);
    }

    // --- ROUTE: CALLBACK ---
    if (urlObj.searchParams.has('code')) {
        const code = urlObj.searchParams.get('code');

        try {
            // 1. Swap code for tokens
            const tokenResponse = await fetch('https://start.exactonline.nl/api/oauth2/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code: code!,
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code',
                    client_id: clientId,
                    client_secret: clientSecret,
                })
            });

            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.json();
                throw new Error(`Exact Token Error: ${JSON.stringify(errorData)}`);
            }

            const tokens = await tokenResponse.json();

            // 2. Identify the user (we need to know WHO is logging in)
            // In a real app, you'd pass a 'state' param with the user_id or use the JWT
            // For POC, we might need a way to link this back. 
            // Better: Use the Supabase Auth context if the user is logged in
            const authHeader = req.headers.get('Authorization');
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
            const supabase = createClient(supabaseUrl, supabaseServiceKey);

            let userId;
            if (authHeader) {
                const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
                if (user) userId = user.id;
            }

            // Fallback: If no auth header (browser redirect), we might have used 'state'
            if (!userId && urlObj.searchParams.has('state')) {
                userId = urlObj.searchParams.get('state');
            }

            if (!userId) {
                throw new Error('User not identified. Please ensure the login was initiated from the app.');
            }

            // 3. Encrypt and store tokens
            const encryptedAccess = await encrypt(tokens.access_token, encryptionKey);
            const encryptedRefresh = await encrypt(tokens.refresh_token, encryptionKey);
            const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;

            const { error: dbError } = await supabase
                .from('integration_tokens')
                .upsert({
                    user_id: userId,
                    provider: 'exact_online',
                    access_token_encrypted: encryptedAccess,
                    refresh_token_encrypted: encryptedRefresh,
                    expires_at: expiresAt,
                    updated_at: new Date().toISOString()
                });

            if (dbError) throw new Error(`DB Error: ${dbError.message}`);

            // 4. Redirect back to App
            // Use a custom scheme like easyaccounting://
            return Response.redirect(`easyaccounting://exact-success?user_id=${userId}`, 302);

        } catch (error) {
            console.error('Callback Error:', error.message);
            return Response.redirect(`easyaccounting://exact-error?message=${encodeURIComponent(error.message)}`, 302);
        }
    }

    return new Response(JSON.stringify({ message: 'Exact Auth Function active' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
});
