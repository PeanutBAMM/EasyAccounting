import { supabase } from '../../lib/supabase';

export interface MonthlyFinanceStats {
    totalInclBTW: number;
    totalExclBTW: number;
    btw21Total: number;
    btw9Total: number;
    btw0Total: number;
    scanCount: number;
    scanLimit: number;
}

export interface RecentReceiptSummary {
    id: string;
    merchant_name: string;
    total_amount: number;
    btw21: number;
    btw9: number;
    is_synced: boolean;
    transaction_date: string;
}

/**
 * Fetches data for the dashboard finance widget and scan counter.
 */
export const getDashboardStats = async (userId: string): Promise<MonthlyFinanceStats> => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // 1. Get profile for scan limit / is_pro
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_pro')
        .eq('id', userId)
        .single();

    const isPro = profile?.is_pro || false;
    const scanLimit = isPro ? 50 : 10;

    // 2. Get scan count for the current month
    const { count: scanCount } = await supabase
        .from('receipts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('transaction_date', startOfMonth);

    // 3. Get totals and VAT breakdown
    // Note: To get precise breakdown, we query receipt_items joined with receipts
    const { data: items } = await supabase
        .from('receipt_items')
        .select(`
            total_price,
            vat_code,
            receipts!inner(user_id, transaction_date)
        `)
        .eq('receipts.user_id', userId)
        .gte('receipts.transaction_date', startOfMonth);

    let totalExclBTW = 0;
    let btw21Total = 0;
    let btw9Total = 0;
    let btw0Total = 0;

    items?.forEach(item => {
        const price = Number(item.total_price) || 0;
        totalExclBTW += price;

        if (item.vat_code === '21%') btw21Total += price * 0.21;
        else if (item.vat_code === '9%') btw9Total += price * 0.09;
        else btw0Total += 0; // Usually 0% or redacted
    });

    const totalInclBTW = totalExclBTW + btw21Total + btw9Total;

    return {
        totalInclBTW,
        totalExclBTW,
        btw21Total,
        btw9Total,
        btw0Total,
        scanCount: scanCount || 0,
        scanLimit
    };
};

/**
 * Fetches the 4 most recent receipts for the dashboard grid.
 */
export const getRecentReceiptsForDashboard = async (userId: string): Promise<RecentReceiptSummary[]> => {
    const { data: receipts } = await supabase
        .from('receipts')
        .select(`
            id,
            merchant_name,
            total_amount,
            is_synced,
            transaction_date,
            receipt_items (
                total_price,
                vat_code
            )
        `)
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false })
        .limit(4);

    if (!receipts) return [];

    return receipts.map((r: any) => {
        let btw21 = 0;
        let btw9 = 0;

        r.receipt_items?.forEach((item: any) => {
            const price = Number(item.total_price) || 0;
            if (item.vat_code === '21%') btw21 += price * 0.21;
            else if (item.vat_code === '9%') btw9 += price * 0.09;
        });

        return {
            id: r.id,
            merchant_name: r.merchant_name || 'Onbekend',
            total_amount: Number(r.total_amount) || 0,
            btw21,
            btw9,
            is_synced: r.is_synced || false,
            transaction_date: r.transaction_date
        };
    });
};
