-- Compliance Schema Update
ALTER TABLE public.receipts
ADD COLUMN IF NOT EXISTS device_id UUID,
ADD COLUMN IF NOT EXISTS merchant_vat_number TEXT,
ADD COLUMN IF NOT EXISTS audit_trail_uuid UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS is_synced BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP WITH TIME ZONE;

-- Comments for compliance logging
COMMENT ON COLUMN public.receipts.device_id IS 'Unique ID for the device that scanned the receipt (Audit Trail)';
COMMENT ON COLUMN public.receipts.audit_trail_uuid IS 'Digital stamp for the document integrity (Audit Trail)';
COMMENT ON COLUMN public.receipts.is_synced IS 'Tracks if the document is pushed to the accounting platform (Compliance: Retention)';

-- Index for faster monthly queries (Compliance: Retention)
CREATE INDEX IF NOT EXISTS idx_receipts_is_synced ON public.receipts(is_synced);
