-- Update get_monthly_finance_stats to use created_at (scan date) instead of transaction_date
-- Also add index for performance on created_at

CREATE INDEX IF NOT EXISTS idx_receipts_user_created_at ON public.receipts(user_id, created_at);

CREATE OR REPLACE FUNCTION public.get_monthly_finance_stats(p_user_id UUID, p_start_date TIMESTAMP WITH TIME ZONE)
RETURNS TABLE (
    total_excl_btw DECIMAL,
    total_incl_btw DECIMAL,
    btw_21_total DECIMAL,
    btw_9_total DECIMAL,
    btw_0_total DECIMAL,
    scan_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH monthly_receipts AS (
        SELECT id FROM public.receipts 
        WHERE user_id = p_user_id 
        AND created_at >= p_start_date
    ),
    stats AS (
        SELECT 
            SUM(total_price) as total_excl,
            SUM(CASE WHEN vat_code = '21%' THEN total_price * 0.21 ELSE 0 END) as v21,
            SUM(CASE WHEN vat_code = '9%' THEN total_price * 0.09 ELSE 0 END) as v9,
            SUM(CASE WHEN vat_code = '0%' THEN 0 ELSE 0 END) as v0
        FROM public.receipt_items
        WHERE receipt_id IN (SELECT id FROM monthly_receipts)
    ),
    scans AS (
        SELECT COUNT(*) as c FROM monthly_receipts
    )
    SELECT 
        COALESCE(stats.total_excl, 0)::DECIMAL,
        (COALESCE(stats.total_excl, 0) + COALESCE(stats.v21, 0) + COALESCE(stats.v9, 0))::DECIMAL,
        COALESCE(stats.v21, 0)::DECIMAL,
        COALESCE(stats.v9, 0)::DECIMAL,
        COALESCE(stats.v0, 0)::DECIMAL,
        COALESCE(scans.c, 0)::BIGINT
    FROM stats, scans;
END;
$$;
