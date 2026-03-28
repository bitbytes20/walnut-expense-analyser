# Requirements: Walnut Expense Analyser

**Defined:** 2026-03-27
**Core Value:** A household owner can reliably import local bank statements and quickly understand where the money goes without giving up privacy or trust in the numbers.

## v1 Requirements

### Onboarding and Security

- [ ] **ONBD-01**: Owner can complete guided onboarding that sets up the household profile, a 6+ digit PIN, and the first account profile.
- [ ] **SECU-01**: App requires the PIN on launch and after 15 minutes of inactivity.
- [ ] **SECU-02**: Owner must confirm they have saved the one-time recovery key before onboarding can finish.
- [ ] **SECU-03**: Owner can access advanced owner-only settings including feature flags, diagnostics, backup/restore, and reset tools.

### Accounts and Imports

- [ ] **ACCT-01**: App supports one ICICI account profile in release 1.
- [ ] **IMPT-01**: User can import supported ICICI statements from CSV, XLS, and XLSX files.
- [ ] **IMPT-02**: App rejects unsupported or variant statement formats with clear errors.
- [ ] **IMPT-03**: App stores parsed records and import metadata only, and does not retain uploaded statement files.
- [ ] **IMPT-04**: App blocks clear duplicate imports automatically.
- [x] **IMPT-05**: App routes uncertain duplicate or parsing cases into review instead of silently accepting them.
- [x] **IMPT-06**: Import flow blocks completion on critical issues but allows lower-risk review items to remain queued.
- [x] **IMPT-07**: User can view import history with batch status, counts, and errors.

### Review and Transactions

- [x] **REVW-01**: User can return to a dedicated review queue to resolve pending review items after import.
- [ ] **TRAN-01**: App normalizes transactions into types including expense, income, transfer, refund, ATM withdrawal, and credit-card payment.
- [ ] **TRAN-02**: User can edit transaction amount, date, description, type, category, tags, and rule associations.
- [ ] **TRAN-03**: Every transaction edit creates an audit event with before/after context.
- [ ] **TRAN-04**: User can apply freeform tags to transactions.
- [ ] **TRAN-05**: User can search transactions by text and tags and filter by date, category, amount, type, and review state.

### Categories and Rules

- [x] **CATR-01**: App ships with built-in starter categories and starter categorization rules.
- [x] **CATR-02**: Built-in categories include Food & Dining, Groceries, Shopping, Bills & Utilities, Rent / Housing, Transport, Travel, Healthcare, Entertainment, Education, Insurance, Taxes & Fees, Cash / ATM, Transfers, Credit Card Payment, Income, Refunds / Reimbursements, Investments / Savings, and Uncategorized.
- [x] **CATR-03**: User rules always override heuristic categorization.
- [x] **CATR-04**: User can create, rename, merge, activate, deactivate, and delete only user-created categories.
- [x] **CATR-05**: Built-in system categories are protected from CRUD operations.
- [x] **CATR-06**: Income transactions can be categorized rather than kept in one undifferentiated bucket.

### Dashboard and Insights

- [ ] **DASH-01**: Dashboard presents spend by category, spend trends, top merchants/payees, largest transactions, recurring charges, income-vs-expense summary, recent transactions, and separate summaries for transfers, cash withdrawals, refunds, and credit-card payments.
- [ ] **DASH-02**: Dashboard supports week, month, year, all-time, and custom date-range analysis.
- [ ] **DASH-03**: Dashboard and transaction exploration feel near-instant on local datasets expected for release 1.
- [ ] **DASH-04**: App supports both light and dark themes with a premium finance-dashboard presentation.

### Audit, Support, and System

- [ ] **AUDT-01**: Audit screen shows a full local event ledger covering imports, parser decisions, duplicate decisions, transaction edits, category/rule changes, settings/security events, and similar product events.
- [ ] **SUPP-01**: User can generate a redacted diagnostics bundle safe to share externally.
- [ ] **SUPP-02**: App keeps fuller diagnostics locally for owner troubleshooting without exposing them by default.
- [ ] **CRSH-01**: App stores crash reports locally unless the owner explicitly chooses to share them.
- [ ] **SETG-01**: Settings screen includes theme, idle-lock timeout, encrypted backup/restore, diagnostics, feature flags, granular cleanup, and full reset controls.
- [ ] **ACCS-01**: Core workflows support solid keyboard navigation and keyboard shortcuts.

## v2 Requirements

Deferred to future releases. Tracked but not in the current roadmap for release 1.

### Household Expansion

- **HSHD-01**: Household supports per-member profiles or privacy boundaries inside the shared app model.
- **HSHD-02**: Household supports more than one account profile per owner or bank.

### Banking and Budgeting

- **BANK-01**: App supports additional banks beyond ICICI.
- **BANK-02**: App supports more flexible import mapping for new bank formats.
- **BUDG-01**: User can create and track budgets by category or period.

### Smart Features

- **AINS-01**: App can show lightweight narrative AI summaries as ephemeral dashboard text behind a feature flag.
- **AINS-02**: Feature-flagged AI settings can be expanded with stronger controls or richer summary policies.

### Sync and Clients

- **SYNC-01**: Data can sync securely across devices.
- **WEB-01**: Product supports a web application client.
- **MOBL-01**: Product supports a mobile application client.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Username/password authentication | Desktop-only release 1 uses local PIN unlock instead of account auth |
| Multi-bank support | Deliberately deferred until strict ICICI import is proven reliable |
| Multiple account profiles in release 1 | One-account flow keeps the data model and UX simpler initially |
| Retaining uploaded statement files | Violates the local privacy posture chosen for the product |
| Transaction notes | Tags are sufficient for early releases; notes are deferred |
| Budgeting in release 1 | Parsing, categorization, auditability, and dashboard trust take priority |
| Private family member privacy controls | Early releases use a single shared household view |
| Cloud sync | Offline-first release 1 should not depend on network connectivity |
| Mobile and web clients | Explicitly planned for later after the desktop core is stable |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ONBD-01 | Phase 1 | Complete |
| SECU-01 | Phase 1 | Complete |
| SECU-02 | Phase 1 | Complete |
| SECU-03 | Phase 8 | Pending |
| ACCT-01 | Phase 1 | Complete |
| IMPT-01 | Phase 2 | Pending |
| IMPT-02 | Phase 2 | Pending |
| IMPT-03 | Phase 2 | Pending |
| IMPT-04 | Phase 2 | Pending |
| IMPT-05 | Phase 3 | Complete |
| IMPT-06 | Phase 3 | Complete |
| IMPT-07 | Phase 3 | Complete |
| REVW-01 | Phase 3 | Complete |
| TRAN-01 | Phase 4 | Pending |
| TRAN-02 | Phase 4 | Pending |
| TRAN-03 | Phase 7 | Pending |
| TRAN-04 | Phase 4 | Pending |
| TRAN-05 | Phase 4 | Pending |
| CATR-01 | Phase 5 | Complete |
| CATR-02 | Phase 5 | Complete |
| CATR-03 | Phase 5 | Complete |
| CATR-04 | Phase 5 | Complete |
| CATR-05 | Phase 5 | Complete |
| CATR-06 | Phase 5 | Complete |
| DASH-01 | Phase 6 | Pending |
| DASH-02 | Phase 6 | Pending |
| DASH-03 | Phase 6 | Pending |
| DASH-04 | Phase 6 | Pending |
| AUDT-01 | Phase 7 | Pending |
| SUPP-01 | Phase 7 | Pending |
| SUPP-02 | Phase 7 | Pending |
| CRSH-01 | Phase 7 | Pending |
| SETG-01 | Phase 8 | Pending |
| ACCS-01 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0

---
*Requirements defined: 2026-03-27*
*Last updated: 2026-03-28 after Phase 5 completion*
