// Quick script to query Supabase for LIDL receipt analysis
// Usage: node query-receipt.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryLidlReceipt() {
    console.log('🔍 Querying for LIDL receipt from ricojpinda...\n');

    // First, find the user
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .ilike('email', '%ricojpinda%');

    if (profileError) {
        console.error('Error fetching profiles:', profileError.message);
        return;
    }

    console.log('📧 Found profiles:', profiles);

    if (!profiles || profiles.length === 0) {
        console.log('No user found with email containing "ricojpinda"');
        return;
    }

    const userId = profiles[0].id;

    // Now find LIDL receipts
    const { data: receipts, error: receiptError } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', userId)
        .ilike('merchant_name', '%LIDL%')
        .order('created_at', { ascending: false })
        .limit(1);

    if (receiptError) {
        console.error('Error fetching receipts:', receiptError.message);
        return;
    }

    if (!receipts || receipts.length === 0) {
        console.log('No LIDL receipt found for this user');
        return;
    }

    const receipt = receipts[0];
    console.log('\n📄 LIDL Receipt found:');
    console.log('  ID:', receipt.id);
    console.log('  Merchant:', receipt.merchant_name);
    console.log('  Total Amount:', receipt.total_amount);
    console.log('  Date:', receipt.transaction_date);
    console.log('  Status:', receipt.status);
    console.log('  Created:', receipt.created_at);

    // Get receipt items
    const { data: items, error: itemsError } = await supabase
        .from('receipt_items')
        .select('*')
        .eq('receipt_id', receipt.id)
        .order('id');

    if (itemsError) {
        console.error('Error fetching items:', itemsError.message);
        return;
    }

    console.log('\n📦 Receipt Items (' + items.length + ' items):');
    console.log('─'.repeat(80));

    let totalFromItems = 0;
    let vat21Items = [];
    let vat9Items = [];
    let vat0Items = [];

    items.forEach((item, i) => {
        console.log(`${i + 1}. ${item.description}`);
        console.log(`   Qty: ${item.quantity} | Unit: €${item.unit_price} | Total: €${item.total_price} | VAT: ${item.vat_code || 'N/A'} | RGS: ${item.rgs_code || 'N/A'}`);

        totalFromItems += parseFloat(item.total_price || 0);

        if (item.vat_code === '21%') vat21Items.push(item);
        else if (item.vat_code === '9%') vat9Items.push(item);
        else vat0Items.push(item);
    });

    console.log('─'.repeat(80));

    // Calculate VAT totals
    const vat21Total = vat21Items.reduce((sum, i) => sum + parseFloat(i.total_price || 0), 0);
    const vat9Total = vat9Items.reduce((sum, i) => sum + parseFloat(i.total_price || 0), 0);
    const vat0Total = vat0Items.reduce((sum, i) => sum + parseFloat(i.total_price || 0), 0);

    const vat21Amount = vat21Total * (21 / 121);
    const vat9Amount = vat9Total * (9 / 109);

    console.log('\n📊 ANALYSIS:');
    console.log('  Total from items: €' + totalFromItems.toFixed(2));
    console.log('  Receipt total_amount: €' + receipt.total_amount);
    console.log('  DIFFERENCE: €' + (parseFloat(receipt.total_amount) - totalFromItems).toFixed(2));

    console.log('\n  VAT Breakdown:');
    console.log('    21% items: ' + vat21Items.length + ' items, €' + vat21Total.toFixed(2) + ' (BTW: €' + vat21Amount.toFixed(2) + ')');
    console.log('    9% items:  ' + vat9Items.length + ' items, €' + vat9Total.toFixed(2) + ' (BTW: €' + vat9Amount.toFixed(2) + ')');
    console.log('    0%/Other:  ' + vat0Items.length + ' items, €' + vat0Total.toFixed(2));

    console.log('\n⚠️  ISSUES DETECTED:');
    if (vat9Items.length === 0 && vat9Total === 0) {
        console.log('    - NO 9% VAT items detected! This is likely wrong for a LIDL receipt (food items)');
    }
    if (Math.abs(parseFloat(receipt.total_amount) - totalFromItems) > 0.01) {
        console.log('    - Total amount mismatch: Receipt says €' + receipt.total_amount + ', but items sum to €' + totalFromItems.toFixed(2));
    }
}

queryLidlReceipt().catch(console.error);
