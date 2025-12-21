# UI Design Task List - EasyAccounting

This list focuses on building a premium, modern UI with rich aesthetics and interactive widgets.

## Screens to Implement

- [ ] **Onboarding Screens (Nederlands)**
    - [x] Scherm 1: Waardepropositie (Scannen & Automatiseren)
    - [x] Scherm 2: AI Intelligentie (Boekhoudcodes toewijzen)
    - [x] Scherm 3: Doorsturen naar Boekhoudpakket (Exact Online integration)
    - [x] Scherm 4: Veiligheid & Sync (Supabase beveiliging)
    - [ ] Widget: `OnboardingCarousel`
    - [ ] Widget: `AnimatedPageIndicator`

- [ ] **Login Screen (Premium Refinement)**
    - [ ] Modern dark-mode layout with glassmorphism
    - [ ] Widget: `SocialLoginButton` (Google)
    - [ ] Widget: `AnimatedAppLogo`

- [ ] **Homepage Screen (Main Dashboard)**
    - [ ] Widget: `ExpenseOverviewChart` (Monthly limits/spending)
    - [ ] Widget: `RecentReceiptsList` (Horizontal carousel of latest scans)
    - [ ] Widget: `QuickScanButton` (Floating action button with pulse animation)
    - [ ] Widget: `StatusCard` (Connected SaaS status e.g., Exact Online)

- [ ] **Profile Screen**
    - [ ] Widget: `SubscriptionTierBadge` (Free/Basic/Pro from Mollie)
    - [ ] Widget: `SettingsGroup` (Account, SaaS Settings, Notifications)
    - [ ] Widget: `MolliePaymentStatus` (Current billing info)

## Functional Widgets (Derived from Plan)
- [ ] `OCRProcessingAnimation`: Visual feedback during GPT-4/Vision analysis
- [ ] `RGSCodeSelector`: Interactive component to view/edit assigned accounting codes
- [ ] `SaaSConnectionToggle`: Connect/Disconnect UI for Exact Online
