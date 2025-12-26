export function generateUBL(receipt: any, items: any[]) {
    const now = new Date().toISOString();
    const issueDate = receipt.transaction_date || now.split('T')[0];

    // Simplistic UBL 2.1 / SI-UBL 2.0 XML Generator
    // Focuses on the minimal set required for Exact Online Inbox (Type 181)
    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
    <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
    <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:nen.nl:nlcius:v1.0</cbc:CustomizationID>
    <cbc:ProfileID>urn:fdc:peppol.eu:poacc:billing:01:1.0</cbc:ProfileID>
    <cbc:ID>${receipt.id.substring(0, 8)}</cbc:ID>
    <cbc:IssueDate>${issueDate}</cbc:IssueDate>
    <cbc:InvoiceTypeCode>82</cbc:InvoiceTypeCode> <!-- Simplified Invoice -->
    <cbc:DocumentCurrencyCode>${receipt.currency || 'EUR'}</cbc:DocumentCurrencyCode>
    
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyName>
                <cbc:Name>${receipt.merchant_name || 'Unbekannt'}</cbc:Name>
            </cac:PartyName>
            ${receipt.merchant_vat_number ? `
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${receipt.merchant_vat_number}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>` : ''}
        </cac:Party>
    </cac:AccountingSupplierParty>
    
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${receipt.currency || 'EUR'}">${receipt.total_vat_amount || 0}</cbc:TaxAmount>
    </cac:TaxTotal>
    
    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="${receipt.currency || 'EUR'}">${(receipt.total_amount - (receipt.total_vat_amount || 0)).toFixed(2)}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="${receipt.currency || 'EUR'}">${(receipt.total_amount - (receipt.total_vat_amount || 0)).toFixed(2)}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="${receipt.currency || 'EUR'}">${receipt.total_amount}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="${receipt.currency || 'EUR'}">${receipt.total_amount}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
    
    ${items.map((item, index) => `
    <cac:InvoiceLine>
        <cbc:ID>${index + 1}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="H87">${item.quantity || 1}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="${receipt.currency || 'EUR'}">${item.total_price}</cbc:LineExtensionAmount>
        <cac:Item>
            <cbc:Name>${item.description || 'Product'}</cbc:Name>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="${receipt.currency || 'EUR'}">${item.unit_price || item.total_price}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>`).join('\n')}
</Invoice>`;
}
