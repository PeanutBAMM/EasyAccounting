-- 1. Security: Enable RLS on RGS tables
ALTER TABLE public.user_rgs_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_rgs_codes ENABLE ROW LEVEL SECURITY;

-- Policies for user_rgs_mappings
CREATE POLICY "Users can view own RGS mappings"
    ON public.user_rgs_mappings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own RGS mappings"
    ON public.user_rgs_mappings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own RGS mappings"
    ON public.user_rgs_mappings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own RGS mappings"
    ON public.user_rgs_mappings FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for master_rgs_codes (Read-only for all authenticated users)
CREATE POLICY "Anyone can view master RGS codes"
    ON public.master_rgs_codes FOR SELECT
    TO authenticated
    USING (true);

-- 2. Performance: Indexes
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON public.receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipts_user_transaction_date ON public.receipts(user_id, transaction_date);

-- 3. Performance: Server-side Aggregation Function
CREATE OR REPLACE FUNCTION public.get_monthly_finance_stats(p_user_id UUID, p_start_date DATE)
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
        AND transaction_date >= p_start_date
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
