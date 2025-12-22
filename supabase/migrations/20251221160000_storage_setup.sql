-- Create the receipts bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- RLS policies for the receipts bucket
-- Note: We assume the path is 'user_id/filename.ext'

-- Create the receipts bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- RLS policies for the receipts bucket
-- Note: We assume the path is 'user_id/filename.ext'

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Users can upload their own receipts'
    ) THEN
        CREATE POLICY "Users can upload their own receipts"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (
            bucket_id = 'receipts' AND
            (storage.foldername(name))[1] = auth.uid()::text
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Users can view their own receipts'
    ) THEN
        CREATE POLICY "Users can view their own receipts"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (
            bucket_id = 'receipts' AND
            (storage.foldername(name))[1] = auth.uid()::text
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Users can update their own receipts'
    ) THEN
        CREATE POLICY "Users can update their own receipts"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (
            bucket_id = 'receipts' AND
            (storage.foldername(name))[1] = auth.uid()::text
        )
        WITH CHECK (
            bucket_id = 'receipts' AND
            (storage.foldername(name))[1] = auth.uid()::text
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Users can delete their own receipts'
    ) THEN
        CREATE POLICY "Users can delete their own receipts"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (
            bucket_id = 'receipts' AND
            (storage.foldername(name))[1] = auth.uid()::text
        );
    END IF;
END
$$;
