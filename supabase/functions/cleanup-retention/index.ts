import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

Deno.serve(async (req) => {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('🧹 Starting compliance cleanup (30-day retention)...')

    // 1. Fetch receipts that are synced and older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: receipts, error: fetchError } = await supabase
        .from('receipts')
        .select('id, image_path')
        .eq('is_synced', true)
        .lt('synced_at', thirtyDaysAgo.toISOString());

    if (fetchError || !receipts) {
        return new Response(JSON.stringify({ error: fetchError?.message || 'No receipts to clean' }), { status: 500 });
    }

    console.log(`🗑️ Found ${receipts.length} receipts to delete.`)

    for (const receipt of receipts) {
        // Delete from storage
        const { error: storageError } = await supabase.storage.from('receipts').remove([receipt.image_path]);
        if (storageError) console.error(`Failed to delete storage for ${receipt.id}:`, storageError.message);

        // Delete from database (cascade will take care of items)
        const { error: dbError } = await supabase.from('receipts').delete().eq('id', receipt.id);
        if (dbError) console.error(`Failed to delete DB record for ${receipt.id}:`, dbError.message);
    }

    return new Response(JSON.stringify({ success: true, deleted_count: receipts.length }), {
        headers: { 'Content-Type': 'application/json' }
    });
});
