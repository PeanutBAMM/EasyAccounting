-- Migration: Create integration_tokens table for Exact Online OAuth
-- Date: 2025-12-21

-- Create the table for storing encrypted tokens
CREATE TABLE IF NOT EXISTS public.integration_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('exact_online')),
    access_token_encrypted TEXT NOT NULL, 
    refresh_token_encrypted TEXT NOT NULL,
    expires_at BIGINT NOT NULL, -- Unix timestamp when access token expires
    division_code INT,          -- The user's specific Exact division (optional, can be null initially)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider) -- One token set per provider per user
);

-- Enable Row Level Security
ALTER TABLE public.integration_tokens ENABLE ROW LEVEL SECURITY;

-- 1. Users can ONLY view/manage their OWN tokens
CREATE POLICY "Users manage own tokens" 
ON public.integration_tokens
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_integration_tokens_updated ON public.integration_tokens;
CREATE TRIGGER on_integration_tokens_updated
    BEFORE UPDATE ON public.integration_tokens
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 3. Grant access to service_role (for Edge Functions to read/write)
GRANT ALL ON public.integration_tokens TO service_role;
