# Walnut Expense Analyser PRD

## Product Summary

Walnut Expense Analyser is a Windows-first, local-first desktop app for managing personal finance from imported bank statements. The first release focuses on one trusted import-to-insight loop for a single ICICI account profile in a shared household app on one device.

The app should help the household owner understand spending habits over time without sacrificing privacy or trust in the numbers. Core workflows must work offline, keep source files out of app storage, and preserve a strong audit trail for important actions.

## Target User

- Primary user: a household owner using one Windows desktop device
- Usage mode: shared household data space, but one device owner controls advanced settings, recovery artifacts, and reset actions
- Initial statement source: ICICI exports, beginning with known CSV/XLS/XLSX formats

## Core Value

The owner can reliably import local bank statements and quickly understand where the money goes without giving up privacy or trust in the numbers.

## Release 1 Goals

- Deliver a trusted import-to-insight desktop workflow
- Support one strict ICICI account profile end to end
- Provide guided onboarding, PIN protection, recovery-key flow, and lock/relock behavior
- Establish categorized, searchable, auditable finance data on-device
- Present a premium dashboard with fast filtering and household-friendly clarity

## Release 1 Functional Scope

### Platform and Product Posture

- Windows desktop only
- Local-first, offline-first core workflows
- Personal-use product posture, not a regulated/business-grade finance product
- Modular architecture so future web/mobile/sync work stays possible

### Security and Ownership

- One device owner controls data, backups, diagnostics, and feature flags
- PIN unlock with 6+ digits
- PIN required on launch and after 15 minutes idle
- App locks on Windows session lock or sleep
- Recovery key is mandatory and must be acknowledged during onboarding
- Recovery-key reset rotates the key and creates a security event

### Accounts and Import

- One ICICI account profile in release 1
- Supported input types: CSV, XLS, XLSX for the known ICICI format
- Uploaded statement files are never retained in app storage
- Parsed records and app metadata are stored locally
- Duplicate imports are blocked when clearly matched
- Ambiguous duplicates or parser uncertainties go to review
- Import history is visible with status, counts, and errors

### Transactions, Categories, and Rules

- Track expense, income, transfer, refund, ATM withdrawal, and credit-card payment transaction types
- Keep transfers/refunds/income separate from spend analysis
- Ship with built-in starter categories and starter rules
- User rules always override heuristics
- User-created categories support CRUD; system categories remain protected
- Transactions support editing of key fields with audit logging
- Freeform tags are supported
- Transaction notes are out of scope for early releases

### Dashboard and Insights

- Premium finance-dashboard presentation
- Light and dark themes
- Week, month, year, all-time, and custom date ranges
- Core widgets:
  - spend by category
  - trend over time
  - top merchants/payees
  - largest transactions
  - recurring charges/subscriptions
  - income vs expense summary
  - separate summaries for transfers, cash withdrawals, refunds, and card payments
  - recent transactions
- Lightweight AI summaries are planned behind feature flags later, not as a release-1 dependency

### Search, Audit, and Support

- Advanced search and filtering for transactions
- Full audit ledger for imports, edits, rule changes, settings/security events, and key system events
- Redacted diagnostics bundle safe for sharing
- Richer diagnostics remain local-only
- Crash reports remain local unless explicitly shared

### Settings

- Theme
- Idle-lock timeout
- Encrypted backup/restore
- Diagnostics
- Feature flags
- Granular cleanup
- Full reset

## Release 1 Screens

- Onboarding
- Accounts
- Import Statements
- Import Review
- Transactions
- Categories and Rules
- Dashboard
- Settings
- Audit
- Import History

## Non-Functional Requirements

- Near-instant dashboard and filtering interactions on expected local datasets
- Keyboard navigation and keyboard shortcuts across core workflows
- English-only initially
- One base currency initially
- Full test pyramid from the start
- Documentation updated with every feature and bug fix

## Out of Scope for Release 1

- Multi-bank support
- Multiple account profiles
- Web app
- Mobile app
- Private family-member profiles or role-based access
- Budgeting
- Rich AI recommendations
- Cloud sync
- Transaction notes

## Release Structure

### Release 1: Foundation

Trusted local import-to-insight loop for one ICICI account profile.

### Release 2: Core

Workflow polish, stronger rule-system ergonomics, and budgeting groundwork once trust/stability are proven.

### Release 3: Smart

Feature-flagged AI summaries and future-ready architecture for additional banks, sync, web, and mobile.

## Source of Truth

- Internal planning source: `.planning/`
- Public-facing mirrors: `docs/`
- Delivery tracking: GitHub Issues, Project, Milestone, and Wiki
