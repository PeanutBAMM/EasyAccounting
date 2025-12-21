import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../../lib/supabase';
import { decode } from 'base64-arraybuffer';
import * as Crypto from 'expo-crypto';

/**
 * Optimizies the image for Google Cloud Vision/Gemini (and bandwidth).
 * Recommended width ~1024px.
 */
export const optimizeImage = async (uri: string) => {
    const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return result;
};

/**
 * Uploads the image to Supabase Storage 'receipts' bucket,
 * Creates a database record, and triggers the AI analysis.
 */
export const uploadReceiptImage = async (uri: string, userId: string) => {
    console.log('🏁 Starting uploadReceiptImage for user:', userId);
    try {
        // 1. Optimize
        console.log('🎨 Optimizing image...');
        const optimized = await optimizeImage(uri);

        // 2. Prepare for Upload
        if (!optimized.base64) throw new Error('Optimization failed: No base64 data');

        const fileExt = 'jpg';
        const fileName = `${userId}/${Date.now()}_${Crypto.randomUUID()}.${fileExt}`;
        const contentType = 'image/jpeg';

        // 3. Upload via Supabase SDK
        console.log('📤 Uploading to storage:', fileName);
        const { data, error } = await supabase.storage
            .from('receipts')
            .upload(fileName, decode(optimized.base64), {
                contentType,
                upsert: false,
            });

        if (error) {
            console.error('❌ Supabase Upload Error details:', error);
            throw error;
        }

        // 4. Create Database Record & Get ID
        console.log('📝 Creating database record...');
        const { data: receiptRec, error: dbError } = await supabase
            .from('receipts')
            .insert({
                user_id: userId,
                image_path: data.path,
                status: 'processing',
                merchant_name: 'Wordt verwerkt...',
                total_amount: 0.00,
                currency: 'EUR'
            })
            .select('id')
            .single();

        if (dbError || !receiptRec) {
            console.error('❌ Database Insert Error:', dbError);
            throw dbError;
        }

        console.log('✅ Database record created:', receiptRec.id);

        // 5. Trigger AI Analysis
        console.log('🚀 Triggering AI processing (invoking Edge Function)...');

        // We await this now so we can see any errors in the console immediately
        try {
            const { data: aiData, error: aiError } = await supabase.functions.invoke('process-receipt', {
                body: { receipt_id: receiptRec.id }
            });

            if (aiError) {
                console.error('❌ AI Trigger Error (Supabase Error):', aiError);
            } else if (aiData?.success === false) {
                console.error('❌ AI Business Logic Error:', aiData.error);
            } else {
                console.log('✅ AI Trigger Success! Response:', aiData);
            }
        } catch (err) {
            console.error('❌ AI Trigger Exception:', err);
        }

        return data.path;

    } catch (error) {
        console.error('❌ Upload Service Error:', error);
        throw error;
    }
};
