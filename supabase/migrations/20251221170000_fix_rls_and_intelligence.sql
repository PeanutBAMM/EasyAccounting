-- Migration: Fix RLS for receipt_items and ensure owner-based access
-- This migration ensures that users can manage their own receipt items via the parent receipt's owner.

-- 1. Enable RLS on receipt_items if not already enabled
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own receipt items" ON public.receipt_items;
DROP POLICY IF EXISTS "Users can insert own receipt items" ON public.receipt_items;
DROP POLICY IF EXISTS "Users can update own receipt items" ON public.receipt_items;
DROP POLICY IF EXISTS "Users can delete own receipt items" ON public.receipt_items;

-- 3. Create robust owner-based policies
-- We check the user_id of the parent receipt
CREATE POLICY "Users can view own receipt items"
    ON public.receipt_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.receipts
            WHERE receipts.id = receipt_items.receipt_id
            AND receipts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own receipt items"
    ON public.receipt_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.receipts
            WHERE receipts.id = receipt_id
            AND receipts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own receipt items"
    ON public.receipt_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.receipts
            WHERE receipts.id = receipt_items.receipt_id
            AND receipts.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.receipts
            WHERE receipts.id = receipt_items.receipt_id
            AND receipts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own receipt items"
    ON public.receipt_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.receipts
            WHERE receipts.id = receipt_items.receipt_id
            AND receipts.user_id = auth.uid()
        )
    );
