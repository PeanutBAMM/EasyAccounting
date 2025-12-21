# Implementation Plan - HomeScreen Dashboard

Detailed technical plan for implementing the HomeScreen dashboard with subscription tracking, finance widgets, and recent receipts grid.

## User Review Required

> [!IMPORTANT]
> **Database Schema Changes**: This plan includes adding `is_pro` to the profiles table and `is_synced` to the receipts table. These changes require SQL migrations that must be run on Supabase.

> [!NOTE]
> **Data Calculation Logic**: VAT totals will be calculated by grouping `receipt_items` by `vat_code`. The dashboard will query both `receipts` and `receipt_items` tables.

---

## Database Changes

### Schema Migration SQL

#### [NEW] [homescreen_schema_migration.sql](file:///c:/Users/peanu/.gemini/antigravity/scratch/EasyAccounting/homescreen_schema_migration.sql)
```sql
-- Add subscription status to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT false;

-- Add sync status to receipts
ALTER TABLE public.receipts 
ADD COLUMN IF NOT EXISTS is_synced BOOLEAN DEFAULT false;

-- Create index for faster monthly queries
CREATE INDEX IF NOT EXISTS idx_receipts_transaction_date 
ON public.receipts(user_id, transaction_date);

-- Create index for VAT calculations
CREATE INDEX IF NOT EXISTS idx_receipt_items_vat 
ON public.receipt_items(receipt_id, vat_code);
```

**Required Action**: Run this migration via Supabase SQL Editor.

---

## Service Layer

### [NEW] [dashboardService.ts](file:///c:/Users/peanu/.gemini/antigravity/scratch/EasyAccounting/src/features/dashboard/dashboardService.ts)

Centralized data fetching logic for the dashboard.

**Key Functions**:
- `getMonthlyScanCount(userId, month)`: Count receipts created in the given month.
- `getMonthlyFinanceStats(userId, month)`: Aggregate totals and VAT breakdown from `receipt_items` filtered by `transaction_date`.
- `getRecentReceipts(userId, limit=4)`: Fetch latest receipts with VAT calculation per receipt.
- `getUserProfile(userId)`: Fetch profile with `is_pro` status.

**Data Mapping**:
```typescript
interface MonthlyStats {
  totalInclVAT: number;
  totalExclVAT: number;
  vat21Total: number;
  vat9Total: number;
  scanCount: number;
  scanLimit: number; // 50 for Pro, 10 for Basic
}

interface RecentReceipt {
  id: string;
  merchantName: string;
  totalAmount: number;
  vat21Amount: number;
  vat9Amount: number;
  isSynced: boolean;
  transactionDate: string;
}
```

---

## Component Architecture

### [NEW] [HomeScreen.tsx](file:///c:/Users/peanu/.gemini/antigravity/scratch/EasyAccounting/src/features/dashboard/HomeScreen.tsx)

Main container with `ScrollView` for all widgets.

**Structure**:
1. **Header** (Sticky): Greeting + Profile Button
2. **ScrollView Content**:
   - `MonthlyScansWidget`
   - `FinanceStatsWidget`
   - `RecentReceiptsGrid`
   - Camera FAB (inside scroll, at bottom)

### Widget Components

#### [NEW] [ProfileHeader.tsx](file:///c:/Users/peanu/.gemini/antigravity/scratch/EasyAccounting/src/features/dashboard/components/ProfileHeader.tsx)
- Displays "Goedenavond/Goedemiddag/Goedemorgen, [Name]"
- Profile photo with PRO badge overlay if `is_pro === true`

#### [NEW] [MonthlyScansWidget.tsx](file:///c:/Users/peanu/.gemini/antigravity/scratch/EasyAccounting/src/features/dashboard/components/MonthlyScansWidget.tsx)
- Text: "Nog [X] maandelijkse digitale bonnen"
- Progress bar: `(scanLimit - scanCount) / scanLimit`

#### [NEW] [FinanceStatsWidget.tsx](file:///c:/Users/peanu/.gemini/antigravity/scratch/EasyAccounting/src/features/dashboard/components/FinanceStatsWidget.tsx)
- **DonutChart**: Single ring with 3 segments (Cyan: 21%, Indigo: 9%, Red: Excl.)
- **StatsRow**: 4 values (Totaal Incl., Totaal Excl., 21% Totaal, 9% Totaal)

Chart Library: Use `react-native-svg` with custom drawing or a lightweight library like `react-native-chart-kit`.

#### [NEW] [RecentReceiptsGrid.tsx](file:///c:/Users/peanu/.gemini/antigravity/scratch/EasyAccounting/src/features/dashboard/components/RecentReceiptsGrid.tsx)
- **Layout**: `flexDirection: 'row', flexWrap: 'wrap'` for 2x2 grid
- Each tile rendered via `ReceiptTile` component

#### [NEW] [ReceiptTile.tsx](file:///c:/Users/peanu/.gemini/antigravity/scratch/EasyAccounting/src/features/dashboard/components/ReceiptTile.tsx)
- **Merchant Name**: `toTitleCase()` formatter
- **Total Amount**: Large, Neon Cyan with shadow
- **VAT Badges**: Two circular icons (Cyan/Indigo) + amounts
- **Sync Icon**: Ionicons `cloud-done` (green) or `cloud-offline` (gray)

---

## Navigation Changes

### [MODIFY] [AppNavigator.tsx](file:///c:/Users/peanu/.gemini/antigravity/scratch/EasyAccounting/src/navigation/AppNavigator.tsx)

**Changes**:
1. Replace `ReceiptListScreen` with `HomeScreen` as the initial route in `HomeStack`.
2. Add `ReceiptListScreen` as a separate route.
3. Update header to include Profile button.

**New Structure**:
```typescript
<Stack.Navigator>
  <Stack.Screen name="Home" component={HomeScreen} />
  <Stack.Screen name="ReceiptList" component={ReceiptListScreen} />
  <Stack.Screen name="Camera" component={CameraScreen} />
</Stack.Navigator>
```

---

## Utilities

### [NEW] [formatters.ts](file:///c:/Users/peanu/.gemini/antigravity/scratch/EasyAccounting/src/utils/formatters.ts)

**Helper Functions**:
- `toTitleCase(str: string)`: Converts "ALBERT HEIJN" → "Albert Heijn"
- `getGreeting()`: Returns Dutch greeting based on time of day
- `formatCurrency(amount: number)`: Already exists, ensure consistency

---

## Data Flow

1. **On Mount**: `HomeScreen` calls `dashboardService` functions for:
   - User profile (PRO status)
   - Monthly stats (finance widget)
   - Recent receipts (grid)
2. **State Management**: Use local state or Zustand store for caching
3. **Refresh**: Pull-to-refresh triggers data refetch

---

## Styling

All components use the established design system:
- Background: `#0F172A` → `#000000` gradient
- Glassmorphism: `backgroundColor: 'rgba(30, 41, 59, 0.5)', borderColor: 'rgba(255, 255, 255, 0.05)'`
- Neon Cyan: `#22D3EE`
- Indigo: `#6366F1`
- Red (VAT-free): `#EF4444`

---

## Verification Plan

### Automated Tests
- Unit test `dashboardService` functions with mock Supabase data
- Test VAT calculation logic with known receipt data

### Manual Verification
1. Run schema migration on Supabase
2. Set `is_pro = true` for test user
3. Upload 3-5 receipts with different VAT rates
4. Open HomeScreen and verify:
   - PRO badge appears
   - Scan counter shows correct remaining scans
   - Finance widget shows accurate totals
   - Receipt grid displays 4 items with correct formatting
   - "Toon meer bonnetjes" button navigates to full list
5. Toggle `is_synced` on a receipt and verify icon changes

---

---

## RGS Automation Strategy (The "Intelligence")

To ensure RGS codes are added automatically with high accuracy, we will use a 3-tier mapping system:

1.  **Tier 1: AI Prompt Engineering (Live)**
    - The Gemini 2.0 Flash model is instructed with a "Starter Set" of common RGS codes (e.g., `WBedOveOve` for general, `WBedHoreca` for catering).
    - It uses semantic understanding to map descriptions like "Lunch meeting" to the correct code.

2.  **Tier 2: User-Specific History (Phase 7)**
    - We will implement a `user_rgs_mappings` table.
    - If a user manually changes "Cappuccino" from `General` to `WBedHoreca`, we save this.
    - Future scans for this user will check this table before asking the AI.

3.  **Tier 3: Master RGS Reference Table (Phase 7)**
    - Populate a static table with the full RGS schema (v3.5+).
    - Use semantic search (PGVector) to find the closest official RGS match for any given item description.

---

## Phase 7: Per-Product Accounting Code Management

To achieve full compliance and detailed reporting, users must be able to assign different RGS codes to individual line items on a single receipt.

### UI Architecture - [NEW] [LineItemEditor.tsx](file:///c:/Users/peanu/.gemini/antigravity/scratch/EasyAccounting/src/features/receipts/components/LineItemEditor.tsx)

**Proposed UI Elements**:
- **Drill-down Interaction**: In `ReceiptDetailScreen`, tapping a line item opens a bottom-sheet (ActionSheet) or a focused modal.
- **Form Fields**:
    - `RGS Code`: Searchable dropdown or autocomplete input.
    - `Category`: Quick-select chips (e.g., Office, Travel, Food).
    - `Description`: Correction of OCR errors.
- **Bulk Actions**: "Apply this RGS code to all items" toggle.

### Service Layer - [receiptService.ts](file:///c:/Users/peanu/.gemini/antigravity/scratch/EasyAccounting/src/features/receipts/receiptService.ts)

**New Logic**:
- `updateReceiptItems(items: ReceiptItem[])`: Bulk update for all items in a receipt to minimize API calls.
- `getRgsSuggestions(description: string)`: (Future) AI-assisted lookup for the most likely RGS code based on item description.

### Component Flow

1. **Focus**: User taps item in `ReceiptDetailScreen`.
2. **Edit**: Modal appears with RGS/Category fields.
3. **Draft**: Changes are stored in local state.
4. **Save**: Tapping "Opslaan" in the main detail screen persists all changes (header + items) to Supabase.

---

## Final Verification - Phase 7 (Draft)

### Manual Verification
1. Open a multi-item receipt (e.g., hardware store).
2. Assign 'WBedHuiKantoor' to Item A and 'WBedOveOve' to Item B.
3. Save and refresh; verify that each item retains its unique RGS mapping.
4. Verify that the "Total Amount" remains consistent after edits.
