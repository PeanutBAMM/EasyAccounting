-- Migration: Add RGS mapping and categories for Exact Online integration
-- Phase 4 cleanup

-- Add category to receipts for high-level classification
ALTER TABLE public.receipts 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add rgs_code and category to receipt_items for granular mapping
ALTER TABLE public.receipt_items 
ADD COLUMN IF NOT EXISTS rgs_code TEXT,
ADD COLUMN IF NOT EXISTS category TEXT;

-- Indexing for faster filtering by category
CREATE INDEX IF NOT EXISTS idx_receipts_category ON public.receipts(category);
CREATE INDEX IF NOT EXISTS idx_receipt_items_rgs_code ON public.receipt_items(rgs_code);

-- Enable Realtime for receipts table to support "live" dashboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.receipts;
