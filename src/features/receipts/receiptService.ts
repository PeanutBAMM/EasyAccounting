import { supabase } from '../../lib/supabase';

export interface ReceiptItem {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    vat_code: string;
    category?: string;
    rgs_code?: string;
    user_id: string; // Added for mapping history
}

export interface DetailedReceipt {
    id: string;
    merchant_name: string;
    total_amount: number;
    currency: string;
    transaction_date: string;
    status: string;
    category?: string;
    image_path: string;
    is_synced: boolean;
    user_id: string; // Added for mapping history
    items: ReceiptItem[];
}

/**
 * Fetches a single receipt with all its items.
 */
export const getReceiptDetail = async (receiptId: string): Promise<DetailedReceipt | null> => {
    const { data: receipt, error } = await supabase
        .from('receipts')
        .select(`
            *,
            items:receipt_items(*)
        `)
        .eq('id', receiptId)
        .single();

    if (error || !receipt) {
        console.error('Error fetching receipt detail:', error);
        return null;
    }

    // Populate user_id on items from the parent receipt
    const detailedReceipt = receipt as DetailedReceipt;
    if (detailedReceipt.items) {
        detailedReceipt.items = detailedReceipt.items.map(item => ({
            ...item,
            user_id: detailedReceipt.user_id || (receipt as any).user_id
        }));
    }

    return detailedReceipt;
};

/**
 * Updates a receipt's main fields.
 */
export const updateReceipt = async (receiptId: string, updates: Partial<DetailedReceipt>) => {
    const { data, error } = await supabase
        .from('receipts')
        .update({
            merchant_name: updates.merchant_name,
            total_amount: updates.total_amount,
            transaction_date: updates.transaction_date,
            category: updates.category,
            status: updates.status,
            updated_at: new Date().toISOString()
        })
        .eq('id', receiptId);

    if (error) throw error;
    return data;
};

/**
 * Updates a single receipt item.
 */
export const updateReceiptItem = async (itemId: string, updates: Partial<ReceiptItem>) => {
    const { data, error } = await supabase
        .from('receipt_items')
        .update(updates)
        .eq('id', itemId);

    if (error) throw error;
    return data;
};

/**
 * Bulk updates multiple receipt items and stores/updates user-specific RGS mappings.
 */
export const updateReceiptItems = async (items: ReceiptItem[]) => {
    // 1. Update the actual receipt items
    const { error: itemError } = await supabase
        .from('receipt_items')
        .upsert(items);

    if (itemError) throw itemError;

    // 2. Intelligence: Update user-specific mappings for future auto-suggestions
    // We only map items that have both a description and an RGS code
    const validMappings = items
        .filter(item => item.description && item.rgs_code)
        .map(item => ({
            user_id: item.user_id, // We need to ensure user_id is passed or accessible
            product_description: item.description,
            rgs_code: item.rgs_code,
            category: item.category,
            updated_at: new Date().toISOString()
        }));

    if (validMappings.length > 0) {
        // Use upsert to update if existing mapping exists for (user_id, product_description)
        const { error: mappingError } = await supabase
            .from('user_rgs_mappings')
            .upsert(validMappings, { onConflict: 'user_id, product_description' });

        if (mappingError) {
            console.warn('Warning: Could not save RGS mapping history:', mappingError);
            // We don't throw here as the main update succeeded
        }
    }

    return items;
};

/**
 * Deletes a receipt and its associated storage image.
 */
export const deleteReceipt = async (receiptId: string, imagePath: string) => {
    // 1. Delete image from storage
    const { error: storageError } = await supabase.storage
        .from('receipts')
        .remove([imagePath]);

    if (storageError) {
        console.warn('Storage deletion failed (might be ok if file missing):', storageError);
    }

    // 2. Delete from DB (cascading delete should handle items if configured, 
    // but we'll be safe or let Supabase handles it).
    const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receiptId);

    if (error) throw error;
};
