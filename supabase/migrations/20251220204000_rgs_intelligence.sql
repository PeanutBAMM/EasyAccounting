-- Tier 2: User-specific historical mappings
-- This table stores unique mappings the user has confirmed/edited
CREATE TABLE IF NOT EXISTS public.user_rgs_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_description TEXT NOT NULL,
    rgs_code TEXT NOT NULL,
    category TEXT,
    confidence_score FLOAT DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, product_description)
);

-- Tier 3: Master RGS Reference Table (Starter Set)
-- This table helps the AI and search functionality provide valid codes
CREATE TABLE IF NOT EXISTS public.master_rgs_codes (
    code TEXT PRIMARY KEY, -- e.g. 'WBedOveOve'
    label TEXT NOT NULL, -- e.g. 'Overige bedrijfskosten'
    description TEXT,
    category TEXT, -- e.g. 'Bedrijfskosten'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Helper index for semantic search (if we use it later)
CREATE INDEX IF NOT EXISTS idx_user_rgs_mapping_desc ON public.user_rgs_mappings (user_id, product_description);
CREATE INDEX IF NOT EXISTS idx_master_rgs_label ON public.master_rgs_codes (label);

-- Insert a starter set of RGS codes
INSERT INTO public.master_rgs_codes (code, label, category) VALUES
('WBedOveOve', 'Overige bedrijfskosten', 'Bedrijfskosten'),
('WBedHoreca', 'Horecakosten', 'Verteer / Representatie'),
('WBedHuiKantoor', 'Huisvesting / Kantoor', 'Huisvestingskosten'),
('WBedReis', 'Reiskosten', 'Vervoerskosten'),
('WBedRepr', 'Representatiekosten', 'Verteer / Representatie'),
('WBedAuto', 'Autokosten', 'Vervoerskosten'),
('WBedTel', 'Telecommunicatie', 'Kantoorkosten'),
('WBedInternet', 'Internet', 'Kantoorkosten'),
('WBedAdv', 'Advieskosten', 'Algemene kosten'),
('WBedSoftware', 'Software abonnementen', 'Kantoorkosten')
ON CONFLICT (code) DO NOTHING;

-- Enable Realtime for these tables (useful for syncing UI)
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_rgs_mappings;
