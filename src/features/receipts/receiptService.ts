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
    created_at: string; // Added for filename timestamp
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
    // We strip user_id from items as it doesn't exist in the receipt_items table (only mapping)
    const itemsToUpdate = items.map(({ user_id, ...item }) => item);

    const { error: itemError } = await supabase
        .from('receipt_items')
        .upsert(itemsToUpdate);

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

/**
 * Renames the receipt image in storage based on merchant name and date.
 * Format: [winkelnaam]-[bondatum]-[scantimestamp]
 */
export const renameReceiptImage = async (receipt: DetailedReceipt) => {
    if (!receipt.image_path || !receipt.merchant_name || !receipt.transaction_date) {
        return receipt.image_path;
    }

    try {
        const date = new Date(receipt.transaction_date);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const formattedDate = `${day}${month}${year}`;

        const createdAt = new Date(receipt.created_at);
        const hours = createdAt.getHours().toString().padStart(2, '0');
        const minutes = createdAt.getMinutes().toString().padStart(2, '0');
        const seconds = createdAt.getSeconds().toString().padStart(2, '0');
        const scanTimestamp = `${hours}${minutes}${seconds}`;

        const cleanMerchant = receipt.merchant_name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const fileExt = receipt.image_path.split('.').pop() || 'jpg';

        // Format: [winkelnaam]-[bondatum]-[scantimestamp]
        const newFileName = `${receipt.user_id}/${cleanMerchant}-${formattedDate}-${scanTimestamp}.${fileExt}`;

        if (newFileName === receipt.image_path) return receipt.image_path;

        console.log(`Renaming from ${receipt.image_path} to ${newFileName}`);

        // Renaming in storage (move)
        const { error: moveError } = await supabase.storage
            .from('receipts')
            .move(receipt.image_path, newFileName);

        if (moveError) {
            console.warn('Rename failed (might already exist):', moveError);
            return receipt.image_path;
        }

        // Update DB
        const { error: updateError } = await supabase
            .from('receipts')
            .update({ image_path: newFileName })
            .eq('id', receipt.id);

        if (updateError) throw updateError;

        return newFileName;
    } catch (error) {
        console.error('Error renaming receipt image:', error);
        return receipt.image_path;
    }
};
