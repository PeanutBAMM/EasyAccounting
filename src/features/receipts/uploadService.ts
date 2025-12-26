import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../../lib/supabase';
import { decode } from 'base64-arraybuffer';
import * as Crypto from 'expo-crypto';
import { getDeviceId } from '../../utils/deviceInfo';

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

        const now = new Date();
        const scanTimestamp = now.getHours().toString().padStart(2, '0') +
            now.getMinutes().toString().padStart(2, '0') +
            now.getSeconds().toString().padStart(2, '0');

        const fileExt = 'jpg';
        // Initial filename uses timestamp and UUID for uniqueness, will be renamed after processing
        const fileName = `${userId}/scan-${scanTimestamp}-${Crypto.randomUUID().substring(0, 8)}.${fileExt}`;
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
        const deviceId = await getDeviceId();

        const { data: receiptRec, error: dbError } = await supabase
            .from('receipts')
            .insert({
                user_id: userId,
                image_path: data.path,
                status: 'processing',
                merchant_name: 'Wordt verwerkt...',
                total_amount: 0.00,
                currency: 'EUR',
                device_id: deviceId
            })
            .select('id')
            .single();

        if (dbError || !receiptRec) {
            console.error('❌ Database Insert Error:', dbError);
            throw dbError;
        }

        console.log('✅ Database record created:', receiptRec.id);

        // 5. Trigger AI Analysis (ASYNCHRONOUS)
        console.log('🚀 Triggering AI processing in background...');

        // We do NOT await this anymore. We want to return to the UI immediately.
        supabase.functions.invoke('process-receipt', {
            body: { receipt_id: receiptRec.id }
        }).then(({ data: aiData, error: aiError }) => {
            if (aiError) {
                console.error('❌ AI Trigger Error (Background):', aiError);
            } else if (aiData?.success === false) {
                console.error('❌ AI Business Logic Error (Background):', aiData.error);
            } else {
                console.log('✅ AI Background Processing Finished!');
            }
        }).catch(err => {
            console.error('❌ AI Trigger Exception (Background):', err);
        });

        return receiptRec.id; // Return the ID so the UI can track it if needed

    } catch (error) {
        console.error('❌ Upload Service Error:', error);
        throw error;
    }
};
