# Exact Online API - Implementatie Code Voorbeelden

Dit bestand bevat praktische TypeScript code voorbeelden voor de Exact Online API integratie.

## Inhoudsopgave
1. [Type Definitions](#type-definitions)
2. [OAuth Service](#oauth-service)
3. [Exact Online API Client](#exact-online-api-client)
4. [Purchase Entry Creation](#purchase-entry-creation)
5. [Document Attachment](#document-attachment)
6. [Complete Workflow](#complete-workflow)
7. [Utility Functions](#utility-functions)

---

## Type Definitions

```typescript
// types/exact-online.ts

export interface ExactOnlineTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds (always 600)
  token_type: 'Bearer';
  expires_at: number; // timestamp when token expires
}

export interface ExactOnlineDivision {
  CurrentDivision: number;
  Division: number;
  DivisionCode: string;
  DivisionDescription: string;
}

export interface ExactOnlineDocument {
  ID: string;
  Type: number; // 20 = Purchase Entry
  Subject: string;
  Category?: string;
}

export interface PurchaseEntry {
  EntryID?: string;
  EntryNumber?: number;
  Journal: string;
  Supplier: string;
  Document?: string;
  EntryDate: string; // YYYY-MM-DD
  Currency: string;
  Description: string;
  PaymentCondition?: string; // 'K' = Unapproved, 'B' = Approved
  PurchaseEntryLines: PurchaseEntryLine[];
}

export interface PurchaseEntryLine {
  ID?: string;
  AmountDC: number;
  AmountFC: number;
  GLAccount: string;
  Division: number;
  VATCode?: string;
  VATAmountDC?: number;
  VATAmountFC?: number;
  Description: string;
  Quantity?: number;
  CostCenter?: string;
  CostUnit?: string;
}

export interface ExactOnlineSupplier {
  ID: string;
  Code: string;
  Name: string;
  IsSales: boolean;
  IsPurchase: boolean;
}

export interface ExactOnlineJournal {
  ID: string;
  Code: string;
  Description: string;
  Type: number; // 20 = Purchase Journal
}

export interface ExactOnlineGLAccount {
  ID: string;
  Code: string;
  Description: string;
  Type: number;
}

export interface ExactOnlineVATCode {
  Code: string;
  Description: string;
  Percentage: number; // e.g., 21, 9
  Type: number; // 0 = Sales, 1 = Purchase, 2 = Both
}

export interface ExactOnlineError {
  error?: {
    code?: string;
    message: {
      lang?: string;
      value: string;
    };
  };
  error_description?: string;
}
```

---

## OAuth Service

```typescript
// services/exact-oauth.service.ts

import { ExactOnlineTokens, ExactOnlineError } from '../types/exact-online';

export class ExactOAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private baseUrl = 'https://start.exactonline.nl';

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  /**
   * Genereer de authorization URL voor OAuth flow
   */
  getAuthorizationUrl(forceLogin: boolean = true): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
    });

    if (forceLogin) {
      params.append('force_login', '1');
    }

    return `${this.baseUrl}/api/oauth2/auth?${params.toString()}`;
  }

  /**
   * Ruil authorization code in voor tokens
   */
  async exchangeCodeForTokens(code: string): Promise<ExactOnlineTokens> {
    const params = new URLSearchParams({
      code,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await fetch(`${this.baseUrl}/api/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error: ExactOnlineError = await response.json();
      throw new Error(
        `Token exchange failed: ${error.error_description || error.error?.message?.value || 'Unknown error'}`
      );
    }

    const tokens: Omit<ExactOnlineTokens, 'expires_at'> = await response.json();
    
    // Bereken expiratie timestamp
    const expiresAt = Date.now() + (tokens.expires_in * 1000);

    return {
      ...tokens,
      expires_at: expiresAt,
    };
  }

  /**
   * Refresh access token met refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<ExactOnlineTokens> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await fetch(`${this.baseUrl}/api/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error: ExactOnlineError = await response.json();
      throw new Error(
        `Token refresh failed: ${error.error_description || error.error?.message?.value || 'Unknown error'}`
      );
    }

    const tokens: Omit<ExactOnlineTokens, 'expires_at'> = await response.json();
    
    const expiresAt = Date.now() + (tokens.expires_in * 1000);

    return {
      ...tokens,
      expires_at: expiresAt,
    };
  }

  /**
   * Check of token binnenkort verloopt (binnen 30 seconden)
   */
  shouldRefreshToken(tokens: ExactOnlineTokens): boolean {
    const expiresIn = tokens.expires_at - Date.now();
    return expiresIn < 30000; // binnen 30 seconden
  }

  /**
   * Haal een geldige access token op, refresh indien nodig
   */
  async getValidAccessToken(
    tokens: ExactOnlineTokens,
    onTokenRefresh: (newTokens: ExactOnlineTokens) => Promise<void>
  ): Promise<string> {
    if (this.shouldRefreshToken(tokens)) {
      const newTokens = await this.refreshAccessToken(tokens.refresh_token);
      await onTokenRefresh(newTokens);
      return newTokens.access_token;
    }
    return tokens.access_token;
  }
}
```

---

## Exact Online API Client

```typescript
// services/exact-api.client.ts

import { ExactOnlineTokens, ExactOnlineDivision, ExactOnlineError } from '../types/exact-online';
import { ExactOAuthService } from './exact-oauth.service';

export class ExactOnlineApiClient {
  private baseUrl = 'https://start.exactonline.nl/api/v1';
  private oauthService: ExactOAuthService;
  private tokens: ExactOnlineTokens;
  private division?: number;
  private onTokenRefresh: (tokens: ExactOnlineTokens) => Promise<void>;

  constructor(
    oauthService: ExactOAuthService,
    tokens: ExactOnlineTokens,
    onTokenRefresh: (tokens: ExactOnlineTokens) => Promise<void>
  ) {
    this.oauthService = oauthService;
    this.tokens = tokens;
    this.onTokenRefresh = onTokenRefresh;
  }

  /**
   * Maak een API request met automatische token refresh
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const accessToken = await this.oauthService.getValidAccessToken(
      this.tokens,
      async (newTokens) => {
        this.tokens = newTokens;
        await this.onTokenRefresh(newTokens);
      }
    );

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error: ExactOnlineError = await response.json().catch(() => ({}));
      throw new Error(
        `API request failed (${response.status}): ${
          error.error?.message?.value || 
          error.error_description || 
          response.statusText
        }`
      );
    }

    return response.json();
  }

  /**
   * Haal huidige division op
   */
  async getCurrentDivision(): Promise<number> {
    if (this.division) {
      return this.division;
    }

    const response = await this.makeRequest<{
      d: { results: ExactOnlineDivision[] };
    }>('/current/Me?$select=CurrentDivision');

    this.division = response.d.results[0].CurrentDivision;
    return this.division;
  }

  /**
   * Set division handmatig
   */
  setDivision(division: number): void {
    this.division = division;
  }

  /**
   * Haal leveranciers op
   */
  async getSuppliers(search?: string): Promise<any[]> {
    const division = await this.getCurrentDivision();
    let endpoint = `/${division}/crm/Accounts?$filter=IsPurchase eq true`;
    
    if (search) {
      endpoint += ` and substringof('${encodeURIComponent(search)}', Name)`;
    }
    
    endpoint += '&$select=ID,Name,Code';

    const response = await this.makeRequest<{ d: { results: any[] } }>(endpoint);
    return response.d.results;
  }

  /**
   * Haal journals op (gefilterd op type)
   */
  async getJournals(type?: number): Promise<any[]> {
    const division = await this.getCurrentDivision();
    let endpoint = `/${division}/financial/Journals?$select=ID,Code,Description,Type`;
    
    if (type !== undefined) {
      endpoint += `&$filter=Type eq ${type}`;
    }

    const response = await this.makeRequest<{ d: { results: any[] } }>(endpoint);
    return response.d.results;
  }

  /**
   * Haal purchase journals op
   */
  async getPurchaseJournals(): Promise<any[]> {
    return this.getJournals(20); // Type 20 = Purchase Journal
  }

  /**
   * Haal GL accounts op
   */
  async getGLAccounts(search?: string): Promise<any[]> {
    const division = await this.getCurrentDivision();
    let endpoint = `/${division}/financial/GLAccounts?$select=ID,Code,Description`;
    
    if (search) {
      endpoint += `&$filter=substringof('${encodeURIComponent(search)}', Description)`;
    }

    const response = await this.makeRequest<{ d: { results: any[] } }>(endpoint);
    return response.d.results;
  }

  /**
   * Zoek GL account op basis van numerieke code (bijv. '4000')
   */
  async getGLAccountByCode(code: string): Promise<any | null> {
    const division = await this.getCurrentDivision();
    const endpoint = `/${division}/financial/GLAccounts?$filter=Code eq '${code}'&$select=ID,Code,Description`;
    const response = await this.makeRequest<{ d: { results: any[] } }>(endpoint);
    return response.d.results[0] || null;
  }

  /**
   * Haal VAT codes op
   */
  async getVATCodes(): Promise<any[]> {
    const division = await this.getCurrentDivision();
    const endpoint = `/${division}/vat/VATCodes?$select=ID,Code,Description,Percentage,Type`;

    const response = await this.makeRequest<{ d: { results: any[] } }>(endpoint);
    return response.d.results;
  }

  /**
   * Zoek VAT code op basis van percentage (bijv. 21)
   */
  async getVATCodeByPercentage(percentage: number): Promise<any | null> {
    const codes = await this.getVATCodes();
    return codes.find(v => v.Percentage === percentage) || null;
  }
}
```

---

## Purchase Entry Creation

```typescript
// services/exact-purchase-entry.service.ts

import { ExactOnlineApiClient } from './exact-api.client';
import { PurchaseEntry } from '../types/exact-online';

export class ExactPurchaseEntryService {
  constructor(private apiClient: ExactOnlineApiClient) {}

  /**
   * Creëer een purchase entry (in unapproved state)
   */
  async createPurchaseEntry(entry: PurchaseEntry): Promise<string> {
    const division = await this.apiClient.getCurrentDivision();

    // Zorg ervoor dat entry in unapproved state is
    const entryData = {
      ...entry,
      PaymentCondition: 'K', // K = Cash = Unapproved
    };

    const response = await this.apiClient['makeRequest']<{
      d: { EntryID: string; EntryNumber: number };
    }>(`/${division}/purchaseentry/PurchaseEntries`, {
      method: 'POST',
      body: JSON.stringify(entryData),
    });

    return response.d.EntryID;
  }

  /**
   * Update purchase entry naar approved state (NIET AANBEVOLEN)
   */
  async approvePurchaseEntry(entryId: string): Promise<void> {
    const division = await this.apiClient.getCurrentDivision();

    await this.apiClient['makeRequest']<void>(
      `/${division}/purchaseentry/PurchaseEntries(guid'${entryId}')`,
      {
        method: 'PUT',
        body: JSON.stringify({
          PaymentCondition: 'B', // B = Electronic = Approved
        }),
      }
    );
  }

  /**
   * Haal purchase entry op
   */
  async getPurchaseEntry(entryId: string): Promise<PurchaseEntry> {
    const division = await this.apiClient.getCurrentDivision();

    const response = await this.apiClient['makeRequest']<{
      d: PurchaseEntry;
    }>(`/${division}/purchaseentry/PurchaseEntries(guid'${entryId}')`);

    return response.d;
  }
}
```

---

## Document Attachment

```typescript
// services/exact-document.service.ts

import { ExactOnlineApiClient } from './exact-api.client';
import { ExactOnlineDocument } from '../types/exact-online';

export class ExactDocumentService {
  constructor(private apiClient: ExactOnlineApiClient) {}

  /**
   * Creëer een document voor purchase entry
   */
  async createDocument(subject: string): Promise<string> {
    const division = await this.apiClient.getCurrentDivision();

    const response = await this.apiClient['makeRequest']<{
      d: { ID: string };
    }>(`/${division}/documents/Documents`, {
      method: 'POST',
      body: JSON.stringify({
        Type: 20, // 20 = Purchase Entry Document
        Subject: subject,
      }),
    });

    return response.d.ID;
  }

  /**
   * Upload attachment naar document
   */
  async uploadAttachment(
    documentId: string,
    base64Content: string,
    fileName: string
  ): Promise<void> {
    const division = await this.apiClient.getCurrentDivision();

    await this.apiClient['makeRequest']<void>(
      `/${division}/documents/DocumentAttachments`,
      {
        method: 'POST',
        body: JSON.stringify({
          Document: documentId,
          Attachment: base64Content,
          FileName: fileName,
        }),
      }
    );
  }

  /**
   * Complete flow: document + attachment
   */
  async createDocumentWithAttachment(
    subject: string,
    imageBuffer: Buffer,
    fileName: string
  ): Promise<string> {
    // Stap 1: Creëer document
    const documentId = await this.createDocument(subject);

    // Stap 2: Convert image naar base64
    const base64Image = imageBuffer.toString('base64');

    // Stap 3: Upload attachment
    await this.uploadAttachment(documentId, base64Image, fileName);

    return documentId;
  }
}
```

---

## Complete Workflow

```typescript
// workflows/receipt-to-exact.workflow.ts

import { ExactOAuthService } from '../services/exact-oauth.service';
import { ExactOnlineApiClient } from '../services/exact-api.client';
import { ExactDocumentService } from '../services/exact-document.service';
import { ExactPurchaseEntryService } from '../services/exact-purchase-entry.service';
import { ExactOnlineTokens, PurchaseEntry } from '../types/exact-online';

export interface ReceiptData {
  supplierId: string;
  journalCode: string;
  totalAmount: number;
  vatAmount: number;
  glAccountId: string;
  vatCode: string;
  description: string;
  receiptImage: Buffer;
  receiptDate: Date;
}

export class ReceiptToExactWorkflow {
  private oauthService: ExactOAuthService;
  private apiClient: ExactOnlineApiClient;
  private documentService: ExactDocumentService;
  private purchaseEntryService: ExactPurchaseEntryService;

  constructor(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    tokens: ExactOnlineTokens,
    onTokenRefresh: (tokens: ExactOnlineTokens) => Promise<void>
  ) {
    this.oauthService = new ExactOAuthService(clientId, clientSecret, redirectUri);
    this.apiClient = new ExactOnlineApiClient(
      this.oauthService,
      tokens,
      onTokenRefresh
    );
    this.documentService = new ExactDocumentService(this.apiClient);
    this.purchaseEntryService = new ExactPurchaseEntryService(this.apiClient);
  }

  /**
   * Complete workflow: van digitale bon naar unapproved purchase entry
   */
  async processReceipt(receiptData: ReceiptData): Promise<{
    entryId: string;
    documentId: string;
    status: string;
  }> {
    try {
      // Stap 1: Haal division op
      const division = await this.apiClient.getCurrentDivision();
      console.log(`Processing receipt for division: ${division}`);

      // Stap 2: Creëer document met attachment
      const fileName = `receipt-${Date.now()}.jpg`;
      const documentId = await this.documentService.createDocumentWithAttachment(
        'Digitale bon via EasyAccounting',
        receiptData.receiptImage,
        fileName
      );
      console.log(`Document created: ${documentId}`);

      // Stap 3: Bereken netto bedrag
      const netAmount = receiptData.totalAmount - receiptData.vatAmount;

      // Stap 4: Creëer purchase entry
      const purchaseEntry: PurchaseEntry = {
        Journal: receiptData.journalCode,
        Supplier: receiptData.supplierId,
        Document: documentId,
        EntryDate: receiptData.receiptDate.toISOString().split('T')[0],
        Currency: 'EUR',
        Description: receiptData.description || 'Digitale bon - wacht op goedkeuring',
        PaymentCondition: 'K', // Belangrijk: K = Unapproved
        PurchaseEntryLines: [
          {
            AmountDC: receiptData.totalAmount,
            AmountFC: receiptData.totalAmount,
            GLAccount: receiptData.glAccountId,
            Division: division,
            VATCode: receiptData.vatCode,
            VATAmountDC: receiptData.vatAmount,
            VATAmountFC: receiptData.vatAmount,
            Description: receiptData.description,
          },
        ],
      };

      const entryId = await this.purchaseEntryService.createPurchaseEntry(
        purchaseEntry
      );
      console.log(`Purchase entry created: ${entryId}`);

      return {
        entryId,
        documentId,
        status: 'awaiting_approval',
      };
    } catch (error) {
      console.error('Error processing receipt:', error);
      throw error;
    }
  }

  /**
   * Haal beschikbare suppliers op voor mapping
   */
  async getSuppliers(search?: string) {
    return this.apiClient.getSuppliers(search);
  }

  /**
   * Haal beschikbare GL accounts op voor mapping
   */
  async getGLAccounts(search?: string) {
    return this.apiClient.getGLAccounts(search);
  }

  /**
   * Haal purchase journals op
   */
  async getPurchaseJournals() {
    return this.apiClient.getPurchaseJournals();
  }

  /**
   * Haal VAT codes op
   */
  async getVATCodes() {
    return this.apiClient.getVATCodes();
  }
}
```

---

## Utility Functions

```typescript
// utils/exact-helpers.ts

/**
 * Valideer GUID format
 */
export function isValidGuid(guid: string): boolean {
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return guidRegex.test(guid);
}

/**
 * Format bedrag naar 2 decimalen
 */
export function formatAmount(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Bereken VAT bedrag op basis van percentage
 */
export function calculateVAT(totalAmount: number, vatPercentage: number): {
  netAmount: number;
  vatAmount: number;
} {
  const vatAmount = formatAmount((totalAmount / (100 + vatPercentage)) * vatPercentage);
  const netAmount = formatAmount(totalAmount - vatAmount);
  
  return { netAmount, vatAmount };
}

/**
 * Format datum naar Exact Online format (YYYY-MM-DD)
 */
export function formatDateForExact(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse Exact Online error response
 */
export function parseExactError(error: any): string {
  if (error.error?.message?.value) {
    return error.error.message.value;
  }
  if (error.error_description) {
    return error.error_description;
  }
  if (error.message) {
    return error.message;
  }
  return 'Unknown Exact Online error';
}

/**
 * Retry mechanisme met exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Retry niet bij 400/404 (client errors)
      if (error instanceof Error && error.message.includes('(400)')) {
        throw error;
      }
      if (error instanceof Error && error.message.includes('(404)')) {
        throw error;
      }
      
      // Bij 429 (rate limit) of 5xx errors, retry met backoff
      if (i < maxRetries - 1) {
        const delay = initialDelayMs * Math.pow(2, i);
        console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Cache voor Exact Online resources (suppliers, GL accounts, etc.)
 */
export class ExactResourceCache {
  private cache: Map<string, { data: any; expiresAt: number }> = new Map();
  private ttlMs: number;

  constructor(ttlMinutes: number = 60) {
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}
```

---

## Gebruik Voorbeeld

```typescript
// example-usage.ts

import { ReceiptToExactWorkflow } from './workflows/receipt-to-exact.workflow';
import { ExactOnlineTokens } from './types/exact-online';

async function main() {
  // 1. Setup (verkrijg deze van database/environment)
  const tokens: ExactOnlineTokens = {
    access_token: 'your_access_token',
    refresh_token: 'your_refresh_token',
    expires_in: 600,
    token_type: 'Bearer',
    expires_at: Date.now() + 600000,
  };

  // 2. Callback om nieuwe tokens op te slaan
  const onTokenRefresh = async (newTokens: ExactOnlineTokens) => {
    console.log('Tokens refreshed, save to database...');
    // Sla nieuwe tokens op in database
    // await database.saveTokens(userId, newTokens);
  };

  // 3. Initialiseer workflow
  const workflow = new ReceiptToExactWorkflow(
    process.env.EXACT_CLIENT_ID!,
    process.env.EXACT_CLIENT_SECRET!,
    process.env.EXACT_REDIRECT_URI!,
    tokens,
    onTokenRefresh
  );

  // 4. Haal resources op voor mapping (eenmalig/cached)
  const suppliers = await workflow.getSuppliers('Test Leverancier');
  const glAccounts = await workflow.getGLAccounts('kantoor');
  const journals = await workflow.getPurchaseJournals();
  const vatCodes = await workflow.getVATCodes();

  console.log('Suppliers:', suppliers);
  console.log('GL Accounts:', glAccounts);
  console.log('Journals:', journals);
  console.log('VAT Codes:', vatCodes);

  // 5. Process receipt (voorbeeld data)
  const receiptImage = Buffer.from('...'); // Van file system of database

  const result = await workflow.processReceipt({
    supplierId: suppliers[0].ID,
    journalCode: journals[0].Code,
    totalAmount: 121.00,
    vatAmount: 21.00,
    glAccountId: glAccounts[0].ID,
    vatCode: vatCodes.find(v => v.Percentage === 21)?.Code || '2',
    description: 'Kantoorbenodigdheden',
    receiptImage,
    receiptDate: new Date(),
  });

  console.log('Receipt processed:', result);
  console.log('Status: Awaiting approval in Exact Online');
  console.log('User must approve this entry in Exact Online UI');
}

// Run
main().catch(console.error);
```

---

## Environment Variables

```bash
# .env.example

# Exact Online OAuth Credentials
EXACT_CLIENT_ID=your_client_id_here
EXACT_CLIENT_SECRET=your_client_secret_here
EXACT_REDIRECT_URI=https://your-app.com/exact/callback

# Database connection voor tokens opslaan
DATABASE_URL=postgresql://...

# Optioneel: Rate limiting configuratie
EXACT_MAX_REQUESTS_PER_MINUTE=60
```

---

## Supabase Edge Function Voorbeeld

```typescript
// supabase/functions/sync-to-exact/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ReceiptToExactWorkflow } from './exact-workflow.ts';

serve(async (req) => {
  try {
    const { receiptId } = await req.json();

    // Haal receipt data op uit Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .single();

    if (receiptError) throw receiptError;

    // Haal gebruiker tokens op
    const { data: userTokens, error: tokenError } = await supabase
      .from('exact_tokens')
      .select('*')
      .eq('user_id', receipt.user_id)
      .single();

    if (tokenError) throw tokenError;

    // Download receipt image
    const { data: imageData, error: imageError } = await supabase
      .storage
      .from('receipts')
      .download(receipt.image_path);

    if (imageError) throw imageError;

    // Initialize workflow
    const workflow = new ReceiptToExactWorkflow(
      Deno.env.get('EXACT_CLIENT_ID')!,
      Deno.env.get('EXACT_CLIENT_SECRET')!,
      Deno.env.get('EXACT_REDIRECT_URI')!,
      userTokens,
      async (newTokens) => {
        await supabase
          .from('exact_tokens')
          .update(newTokens)
          .eq('user_id', receipt.user_id);
      }
    );

    // Process receipt
    const result = await workflow.processReceipt({
      supplierId: receipt.supplier_id,
      journalCode: receipt.journal_code,
      totalAmount: receipt.total_amount,
      vatAmount: receipt.vat_amount,
      glAccountId: receipt.gl_account_id,
      vatCode: receipt.vat_code,
      description: receipt.description,
      receiptImage: Buffer.from(await imageData.arrayBuffer()),
      receiptDate: new Date(receipt.date),
    });

    // Update receipt met Exact entry ID
    await supabase
      .from('receipts')
      .update({
        exact_entry_id: result.entryId,
        exact_document_id: result.documentId,
        exact_status: 'awaiting_approval',
        synced_at: new Date().toISOString(),
      })
      .eq('id', receiptId);

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error syncing to Exact:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

---

**Code Versie:** 1.0  
**Laatst Bijgewerkt:** 21 december 2025
