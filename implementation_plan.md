# Implementation Plan - Exact Online Integration

This document outlines the architecture and implementation details for the Exact Online integration in EasyAccounting.

## Architecture Overview

> [!IMPORTANT]
> **Security First**: The `Client Secret` is never stored in the mobile app. All sensitive Exact Online API interactions are proxied through Supabase Edge Functions.

**Data Flow**:
1.  **Mobile App**: Initiates OAuth flow via `WebBrowser.openAuthSessionAsync`.
2.  **Edge Function (`exact-auth`)**: 
    - Redirects to Exact Online login.
    - Handles callback, exchanges code for tokens.
    - Encrypts and stores tokens in `integration_tokens` table.
    - Redirects back to app via deep link (`easyaccounting://`).
3.  **Mobile App**: Calls `exact-sync` Edge Function for a specific receipt.
4.  **Edge Function (`exact-sync`)**: 
    - Refreshes tokens if expired.
    - Downloads receipt image from Supabase Storage.
    - Uploads image to Exact Online (Documents API).
    - Creates `PurchaseEntry` (Status: Unapproved/Open).
    - Updates local receipt status to `is_synced = true`.

---

## 1. Database Schema

### Table: `integration_tokens`
Stores encrypted OAuth tokens per user.

```sql
CREATE TABLE public.integration_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('exact_online')),
    access_token_encrypted TEXT NOT NULL, 
    refresh_token_encrypted TEXT NOT NULL,
    expires_at BIGINT NOT NULL, 
    division_code INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);
```

**Security**: RLS is enabled to ensure users only manage their own tokens. Edge Functions use the `service_role` key to access and refresh tokens.

---

## 2. Supabase Edge Functions

### `exact-auth`
- **Logic**: Implements the OAuth 2.0 Authorization Code flow.
- **Security**: Uses a server-side `ENCRYPTION_KEY` to protect tokens in the database.

### `exact-sync`
- **Logic**: Orchestrates the multi-step process: Token Refresh -> Document Creation -> Attachment Upload -> Purchase Entry Creation.
- **Compliance**: Sets `PaymentCondition: "K"` to ensure entries are "Unapproved", requiring manual user verification in Exact Online.

---

## 3. Frontend Implementation

### Profile & Accounting Hub
- **ProfileScreen**: Added "Boekhoud Koppeling" entry point.
- **AccountingIntegrationScreen**: 2-column grid layout with Exact Online as the primary provider.
- **State Management**: Real-time checking of connection status via Supabase.

### Receipt Sync
- **ReceiptDetailScreen**: "Stuur naar Exact Online" button with loading state and success feedback.
- **Icons**: Visual indicators (`cloud-done` / `cloud-offline`) to show sync status on the dashboard and detail screens.

---

## 4. Verification & Testing

### Completed Checks
- [x] TypeScript Type Safety (0 errors)
- [x] Expo Doctor Health Check (17/17 passed)
- [x] Edge Function Deployment Successful
- [x] Database Migration Applied

### Manual Steps Required
- [ ] Configure `EXACT_CLIENT_ID` and `EXACT_CLIENT_SECRET` in Supabase Secrets.
- [ ] Perform end-to-end OAuth flow in-app.
- [ ] Verify entry creation in Exact Online Sandbox.

---

## 5. Deployment Info
- **Project Ref**: `timpxzmkzgpaluslmhpv`
- **Redirect URI**: `https://timpxzmkzgpaluslmhpv.supabase.co/functions/v1/exact-auth`
