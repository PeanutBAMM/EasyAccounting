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
