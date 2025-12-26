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
 * Uses direct queries as the primary approach (bypasses RPC issues).
 */
export const getDashboardStats = async (userId: string): Promise<MonthlyFinanceStats> => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // 1. Get profile for Pro status
    const { data: profileData } = await supabase
        .from('profiles')
        .select('is_pro')
        .eq('id', userId)
        .single();

    const isPro = profileData?.is_pro || false;
    const scanLimit = isPro ? 50 : 10;

    // 2. Get receipts for this month
    const { data: receipts, count } = await supabase
        .from('receipts')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .gte('created_at', startOfMonth);

    // 3. Get all items for those receipts
    const receiptIds = (receipts || []).map(r => r.id);

    let totalIncl = 0, totalExcl = 0, v21 = 0, v9 = 0, v0 = 0;

    if (receiptIds.length > 0) {
        const { data: items } = await supabase
            .from('receipt_items')
            .select('total_price, vat_code')
            .in('receipt_id', receiptIds);

        (items || []).forEach((item: any) => {
            const price = Number(item.total_price) || 0;
            totalIncl += price;

            if (item.vat_code === '21%') {
                const excl = price / 1.21;
                v21 += excl * 0.21;
                totalExcl += excl;
            } else if (item.vat_code === '9%') {
                const excl = price / 1.09;
                v9 += excl * 0.09;
                totalExcl += excl;
            } else {
                v0 += price;
                totalExcl += price;
            }
        });
    }

    return {
        totalInclBTW: totalIncl,
        totalExclBTW: totalExcl,
        btw21Total: v21,
        btw9Total: v9,
        btw0Total: v0,
        scanCount: count || 0,
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
            created_at,
            receipt_items (
                total_price,
                vat_code
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
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
            transaction_date: r.created_at // Mapping created_at to transaction_date field for component compatibility
        };
    });
};
