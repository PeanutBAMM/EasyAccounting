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

    // 1. Get profile and finance stats in parallel for speed
    const [profileResult, statsResult] = await Promise.all([
        supabase
            .from('profiles')
            .select('is_pro')
            .eq('id', userId)
            .single(),
        supabase.rpc('get_monthly_finance_stats', {
            p_user_id: userId,
            p_start_date: startOfMonth
        })
    ]);

    const isPro = profileResult.data?.is_pro || false;
    const scanLimit = isPro ? 50 : 10;
    const stats = statsResult.data?.[0] || {
        total_excl_btw: 0,
        total_incl_btw: 0,
        btw_21_total: 0,
        btw_9_total: 0,
        btw_0_total: 0,
        scan_count: 0
    };

    return {
        totalInclBTW: Number(stats.total_incl_btw),
        totalExclBTW: Number(stats.total_excl_btw),
        btw21Total: Number(stats.btw_21_total),
        btw9Total: Number(stats.btw_9_total),
        btw0Total: Number(stats.btw_0_total),
        scanCount: Number(stats.scan_count),
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
