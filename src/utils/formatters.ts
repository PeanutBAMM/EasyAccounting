/**
 * Converts a string to Title Case.
 * Example: "ALBERT HEIJN" -> "Albert Heijn", "SHELL STATION" -> "Shell Station"
 */
export const toTitleCase = (str: string): string => {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

/**
 * Returns a Dutch greeting based on the current hour of the day.
 */
export const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Goedemorgen';
    if (hour >= 12 && hour < 18) return 'Goedemiddag';
    if (hour >= 18 && hour < 23) return 'Goedenavond';
    return 'Goedenacht';
};

/**
 * Helper for currency formatting (NL format)
 */
export const formatCurrency = (amount: number, currency = 'EUR'): string => {
    return new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2
    }).format(amount);
};
/**
 * Formats a YYYY-MM-DD date string to DD/MM/YYYY.
 */
export const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
        const [year, month, day] = dateStr.split('-');
        if (!year || !month || !day) return dateStr;
        return `${day}/${month}/${year}`;
    } catch {
        return dateStr;
    }
};
/**
 * Parses a DD/MM/YYYY (or DD-MM-YYYY) date string back to YYYY-MM-DD.
 */
export const parseDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
        const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
        if (parts.length !== 3) return dateStr;

        // Handle both DD/MM/YYYY and YYYY/MM/DD cases if needed
        if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    } catch {
        return dateStr;
    }
};
