import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const body = await req.json().catch(() => ({}));
        const { receipt_id } = body;

        console.log(`Processing receipt: ${receipt_id}`)

        if (!receipt_id) {
            return new Response(
                JSON.stringify({ error: 'Missing receipt_id in request body' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 1. Initialize Supabase Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 2. Initialize Gemini - using gemini-2.0-flash which is the latest and most available
        const geminiKey = Deno.env.get('GEMINI_API_KEY')!
        if (!geminiKey) {
            throw new Error('Missing GEMINI_API_KEY.')
        }

        const genAI = new GoogleGenerativeAI(geminiKey)
        // Changed to gemini-2.0-flash - the newest multimodal model
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

        // 3. Fetch Receipt Data
        const { data: receipt, error: fetchError } = await supabase
            .from('receipts')
            .select('*')
            .eq('id', receipt_id)
            .single()

        if (fetchError || !receipt) {
            throw new Error(`Receipt ${receipt_id} not found in database. Error: ${fetchError?.message}`)
        }

        console.log(`Found receipt in DB. User ID: ${receipt.user_id}`)

        // 3.5 Fetch RGS Intelligence (User History + Master Codes)
        const [{ data: userHistory }, { data: masterCodes }] = await Promise.all([
            supabase
                .from('user_rgs_mappings')
                .select('product_description, rgs_code, category')
                .eq('user_id', receipt.user_id)
                .limit(40), // Increased history context
            supabase
                .from('master_rgs_codes')
                .select('code, label, category')
                .limit(100) // Increased master reference context
        ]);

        const historyContext = userHistory?.length
            ? `USER PREVIOUS MAPPINGS (Highest Priority):\n${userHistory.map(h => `- "${h.product_description}" -> ${h.rgs_code} (${h.category})`).join('\n')}`
            : 'No user history available.';

        const masterContext = masterCodes?.length
            ? `VALID RGS CODES REFERENCE:\n${masterCodes.map(m => `- ${m.code}: ${m.label} (${m.category})`).join('\n')}`
            : 'No master RGS codes available.';

        // 4. Download Image from Storage
        // ... (rest of code)
        const { data: imageBlob, error: downloadError } = await supabase
            .storage
            .from('receipts')
            .download(receipt.image_path)

        if (downloadError) {
            throw new Error(`Failed to download image from storage: ${downloadError.message}`)
        }

        // Convert Blob to ArrayBuffer then Base64
        const arrayBuffer = await imageBlob.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)

        let binary = '';
        const len = uint8Array.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        const base64Image = btoa(binary);

        console.log(`Image downloaded and converted (Size: ${len} bytes)`)

        // 5. Send to Gemini for Analysis
        const prompt = `
          Analyze this receipt image and extract the following data in strict JSON format.
          
          INTELLIGENCE CONTEXT (Use this to assign bookkeeping codes):
          ${historyContext}
          
          ${masterContext}

          EXTRACTION RULES:
          - merchant_name (string)
          - category (string, e.g. 'Horeca', 'Boodschappen', 'Kantoorartikelen', 'Elektronica', 'Brandstof')
          - total_amount (number, use . for decimal)
          - currency (string, e.g. EUR, USD)
          - transaction_date (string, YYYY-MM-DD format)
          - items: array of objects with:
            - description (string)
            - quantity (number)
            - total_price (number)
            - vat_rate (string, e.g. "21%")
            - category (string)
            - rgs_code (string, MANDATORY. If no historical match found in "USER PREVIOUS MAPPINGS", you MUST select the most logical code from "VALID RGS CODES REFERENCE". If still unsure, use 'WBedOveOve' as fallback).

          CRITICAL: Every item MUST have an 'rgs_code'. Do NOT return null for this field.
          Return ONLY raw JSON, no markdown formatting.
        `

        console.log('Sending request to Gemini 2.0 Flash...')
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: "image/jpeg"
                }
            }
        ])

        const response = await result.response
        const text = response.text()
        console.log('Received raw Gemini Response:', text)

        // Clean up response
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim()

        let extractedData;
        try {
            extractedData = JSON.parse(cleanedText)
        } catch (e) {
            console.error('Failed to parse Gemini JSON:', cleanedText);
            throw new Error(`AI returned invalid JSON: ${(e as Error).message}. Raw response: ${text.substring(0, 100)}...`)
        }

        // 6. Update Database
        console.log('Updating database with extracted data...')
        const { error: updateError } = await supabase
            .from('receipts')
            .update({
                merchant_name: extractedData.merchant_name || 'Onbekend',
                category: extractedData.category || 'Overig',
                total_amount: extractedData.total_amount || 0,
                currency: extractedData.currency || 'EUR',
                transaction_date: extractedData.transaction_date || new Date().toISOString().split('T')[0],
                status: 'review_required',
                updated_at: new Date().toISOString()
            })
            .eq('id', receipt_id)

        if (updateError) {
            throw new Error(`Failed to update receipt in database: ${updateError.message}`)
        }

        // 7. Insert Items
        if (extractedData.items && Array.isArray(extractedData.items)) {
            console.log(`Inserting ${extractedData.items.length} line items...`)
            // Delete existing items
            await supabase.from('receipt_items').delete().eq('receipt_id', receipt_id)

            const itemsToInsert = extractedData.items.map((item: any) => ({
                receipt_id: receipt_id,
                description: item.description || 'Product',
                quantity: item.quantity || 1,
                unit_price: (item.total_price || 0) / (item.quantity || 1),
                total_price: item.total_price || 0,
                vat_code: item.vat_rate || '21%',
                category: item.category || extractedData.category || 'Overig',
                rgs_code: item.rgs_code || null
            }))

            if (itemsToInsert.length > 0) {
                const { error: itemsError } = await supabase.from('receipt_items').insert(itemsToInsert)
                if (itemsError) console.error('Failed to insert items:', itemsError.message)
            }
        }

        console.log('✅ AI Processing finished successfully.')
        return new Response(
            JSON.stringify({ success: true, data: extractedData }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('❌ Edge Function Error:', (error as Error).message)
        return new Response(
            JSON.stringify({ success: false, error: (error as Error).message }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
