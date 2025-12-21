-- Add subscription status to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT false;

-- Add sync status to receipts
ALTER TABLE public.receipts 
ADD COLUMN IF NOT EXISTS is_synced BOOLEAN DEFAULT false;

-- Create index for faster monthly queries
CREATE INDEX IF NOT EXISTS idx_receipts_transaction_date 
ON public.receipts(user_id, transaction_date);

-- Create index for VAT calculations
CREATE INDEX IF NOT EXISTS idx_receipt_items_vat 
ON public.receipt_items(receipt_id, vat_code);
