-- Drop and recreate the function cleanly
DROP FUNCTION IF EXISTS public.get_monthly_finance_stats(UUID, TIMESTAMP WITH TIME ZONE);

CREATE FUNCTION public.get_monthly_finance_stats(p_user_id UUID, p_start_date TIMESTAMP WITH TIME ZONE)
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
    item_stats AS (
        SELECT 
            COALESCE(SUM(total_price), 0) as total_incl,
            COALESCE(SUM(CASE WHEN vat_code = '21%' THEN (total_price / 1.21) * 0.21 ELSE 0 END), 0) as v21,
            COALESCE(SUM(CASE WHEN vat_code = '9%' THEN (total_price / 1.09) * 0.09 ELSE 0 END), 0) as v9,
            COALESCE(SUM(CASE WHEN vat_code = '0%' THEN total_price ELSE 0 END), 0) as v0,
            COALESCE(SUM(
                CASE 
                    WHEN vat_code = '21%' THEN total_price / 1.21
                    WHEN vat_code = '9%' THEN total_price / 1.09
                    ELSE total_price
                END
            ), 0) as total_excl
        FROM public.receipt_items
        WHERE receipt_id IN (SELECT id FROM monthly_receipts)
    )
    SELECT 
        i.total_excl::DECIMAL,
        i.total_incl::DECIMAL,
        i.v21::DECIMAL,
        i.v9::DECIMAL,
        i.v0::DECIMAL,
        (SELECT COUNT(*) FROM monthly_receipts)::BIGINT
    FROM item_stats i;
END;
$$;
