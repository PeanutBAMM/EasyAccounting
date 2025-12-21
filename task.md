## Phase 4: Exact Online & RGS Mapping [COMPLETED]
- [x] Database: Add `rgs_code` and `category` to `receipt_items`
- [x] Database: Add `category` to `receipts`
- [x] Edge Function: Update Gemini prompt to suggest categories/RGS codes

## Phase 5: UI Dashboard & Header [COMPLETED]
- [x] Database & Schema: `is_pro`, `is_synced` added
- [x] Service Layer: `dashboardService.ts` implemented
- [x] ProfileHeader: Dynamic greeting & PRO badge
- [x] MonthlyScansWidget: Gradient progress bar
- [x] FinanceStatsWidget: Donut chart with structured legend
- [x] RecentReceiptsGrid: 2x2 layout with "Toon meer"
- [x] ReceiptTile: Glowing amounts & VAT icons
- [x] AppNavigator: Fixed Central Camera FAB
- [x] **Real-time**: Implement Supabase Real-time listeners for instant dashboard updates
- [x] **Pull-to-Refresh**: Final verification of cache clearing

## Phase 6: Receipt Detail & Editing [COMPLETED]
- [x] Create `src/features/receipts/ReceiptDetailScreen.tsx`
    - [x] Responsive image preview (with zoom/full screen)
    - [x] Glassmorphism info cards for Merchant, Date, Totals
    - [x] Editable fields for verification (VAT, Category, RGS)
    - [x] Delete receipt functionality
- [x] Navigation Integration
    - [x] Add `ReceiptDetail` to `HomeStack`
    - [x] Link `ReceiptTile` and `RecentReceiptsGrid` to Detail screen
- [x] Database Updates
    - [x] Implement `updateReceipt()` and `deleteReceipt()` in service layer
- [x] UI Polish
    - [x] Glowing status badges (Verified / Pending)
    - [x] Smooth transition animations
    - [x] Verified with `tsc` and `expo-doctor` (0 errors)

## Phase 7: Exact Online Integration [PENDING]
...
