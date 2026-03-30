# Walnut — Expense Analyser

> A local-first, privacy-focused desktop finance app for understanding where your money goes — without giving up your data.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)](https://github.com/microsoft/windows)
[![Electron](https://img.shields.io/badge/electron-30-47848f.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/react-19-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5-3178c6.svg)](https://www.typescriptlang.org/)

---

Walnut lets you import your bank statements, automatically categorise transactions, and explore your spending through a premium dashboard — all stored locally on your device. No cloud sync, no account sign-up, no data leaving your machine.

Built for households that want real insight into their finances without trusting a third-party service with sensitive transaction data.

---

## Features

### Privacy by Design
- All data stays on your device in a local SQLite database
- PIN protection on launch and after configurable idle timeout
- One-time recovery key for PIN reset
- Encrypted backup/restore (scrypt + AES-256-GCM)
- Crash reports and diagnostics stored locally unless you explicitly share them

### Statement Import
- Import ICICI bank statements from **CSV, XLS, and XLSX** files
- Confidence-scored parser with hard duplicate blocking
- Mixed import gating: critical errors block completion; low-confidence items route to a review queue
- Row-level parse error diagnostics with expected-vs-found detail and suggested fixes
- Retry with a corrected file without losing your import batch context

### Review Queue
- Dedicated queue for ambiguous imports (uncertain duplicates, parser edge cases)
- Return to it later without losing triage progress
- Bulk approve/dismiss with keyboard shortcuts (`A` to approve, `R` to reject)
- Full import history with batch status, counts, and error receipts

### Transaction Ledger
- Transactions normalised into types: expense, income, transfer, refund, ATM withdrawal, credit-card payment
- Edit amount, date, description, type, category, and tags
- Freeform tags for your own retrieval habits
- Full-text search, advanced filter drawer (date, category, amount, type, review state)
- Save named filter presets and restore in one click
- Multi-select with checkboxes and shift+click range select
- Bulk category and tag assignment from a persistent action bar

### Categories and Rules
- 19 built-in starter categories: Food & Dining, Groceries, Shopping, Bills & Utilities, Rent / Housing, Transport, Travel, Healthcare, Entertainment, Education, Insurance, Taxes & Fees, Cash / ATM, Transfers, Credit Card Payment, Income, Refunds / Reimbursements, Investments / Savings, Uncategorized
- User-defined rules always override heuristic categorisation
- Preview bulk rule application before committing
- Manage your own categories (create, rename, merge, activate, deactivate, delete)
- System categories are protected from modification

### Dashboard
- Spend by category, trends over time, top merchants/payees
- Recurring charge detection
- Largest transactions, recent activity
- Income-vs-expense summary with separate views for transfers, cash, refunds, and credit-card payments
- Date-range controls: week, month, year, all-time, or custom range
- Both **light and dark themes** with a premium finance-dashboard presentation

### Audit and Diagnostics
- Full local event ledger covering imports, parser decisions, edits, rule changes, and security events
- Every transaction edit creates an audit event with before/after context
- Generate a redacted diagnostics bundle safe to share externally
- Owner-only settings screen with feature flags, cleanup tools, and full reset

---

## Getting Started

### Prerequisites

- **Node.js** 20 or later
- **npm** 10 or later
- Windows 10 / 11 (primary supported platform)

### Install

```bash
git clone https://github.com/your-org/walnut-expense-analyser.git
cd walnut-expense-analyser
npm install
```

### Development

Start the Vite dev server (renderer only — useful for UI work without Electron):

```bash
npm run dev
```

Start the full Electron app in development mode:

```bash
npm run dev:electron
```

> The first run rebuilds the native `better-sqlite3` module for Electron. This takes a moment but only runs once per Electron version.

### Build

```bash
npm run build
```

Outputs to `out/` — main process (`out/main/index.cjs`), preload (`out/preload/index.cjs`), and renderer (`out/renderer/`).

### Testing

Unit tests (Vitest):

```bash
npm run test:unit
```

End-to-end tests (Playwright):

```bash
npm run test:e2e
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | [Electron](https://www.electronjs.org/) 30 |
| UI framework | [React](https://react.dev/) 19 |
| Language | [TypeScript](https://www.typescriptlang.org/) 5 |
| Database | [SQLite](https://www.sqlite.org/) via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) |
| Build tool | [Vite](https://vite.dev/) + [esbuild](https://esbuild.github.io/) |
| Charts | [Recharts](https://recharts.org/) |
| Password hashing | [@node-rs/argon2](https://github.com/napi-rs/node-rs) |
| Unit tests | [Vitest](https://vitest.dev/) |
| E2E tests | [Playwright](https://playwright.dev/) |

No UI component library — all components are hand-built with inline styles and CSS custom properties. No cloud dependencies at runtime.

---

## Architecture

Walnut follows Electron's standard main/renderer split with a strict IPC boundary:

```
src/
  main/           # Node.js process — DB, file I/O, security, IPC handlers
    import/       # ICICI parser, duplicate detection, import coordinator
    ipc/          # All IPC handlers (transactions, categories, dashboard, …)
    persistence/  # Drizzle schema + DB connection
    security/     # PIN service, session lock, backup encryption
    diagnostics/  # Crash reports, diagnostics bundle
  preload/        # Typed bridge exposing window.walnut.*
  renderer/       # React app — feature-based folder structure
    features/
      onboarding/
      import/
      transactions/
      categories-rules/
      dashboard/
      audit/
      settings/
  shared/
    contracts/    # Zod-validated IPC contracts shared across processes
```

The renderer never touches the database directly. All data operations go through typed IPC handlers.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+1` | Dashboard |
| `Ctrl+2` | Import |
| `Ctrl+3` | Review Queue |
| `Ctrl+4` | Transactions |
| `Ctrl+5` | Categories & Rules |
| `Ctrl+6` | Audit |
| `Ctrl+7` | Settings |
| `A` | Approve review item (review queue focus) |
| `R` | Reject review item (review queue focus) |
| `↑ / ↓` | Navigate review queue items |

---

## Roadmap

### v1.0 — Foundation (Shipped)
The complete local import-to-insight loop for a single ICICI account.

- [x] Guided onboarding with PIN and recovery key
- [x] ICICI statement import (CSV / XLS / XLSX) with duplicate blocking
- [x] Review queue with mixed import gating
- [x] Transaction ledger with editing, tags, and advanced search
- [x] Category taxonomy and rule engine with user-rule precedence
- [x] Premium dashboard with spend analytics and date-range controls
- [x] Full audit event ledger and local diagnostics
- [x] Owner settings — encrypted backup, change-PIN, theme, keyboard shortcuts

### v1.1 — Core (In Progress)
Polish and hardening for daily use.

- [x] Transaction multi-select and bulk category/tag assignment
- [x] Bulk review queue operations with keyboard shortcuts
- [x] Import error diagnostics with row-level detail and in-place retry
- [x] Named filter presets — save, restore, rename, delete
- [ ] Rule system expansion — richer rule authoring, merge safety, maintenance tools
- [ ] Budgeting foundations — category targets, budget models, variance reporting

### v2.0 — Smart (Planned)
AI-assisted insights and platform expansion.

- [ ] Lightweight AI narrative summaries behind owner-controlled feature flags
- [ ] Additional bank support beyond ICICI
- [ ] Sync architecture — secure cross-device data sync
- [ ] Web client
- [ ] Mobile client

---

## Privacy Commitments

- Statement files are **never retained** after parsing — only the extracted records are stored
- No telemetry, analytics, or network calls at runtime
- Backup files are encrypted with a key derived from your PIN (scrypt + AES-256-GCM)
- Crash reports stay on-device unless you explicitly generate and share a diagnostics bundle
- The redacted diagnostics bundle strips account numbers and transaction amounts before export

---

## Contributing

Contributions are welcome. A few things to know before you start:

1. **Read the context first.** The `.planning/` directory contains phase context, discussion logs, and verified plans. Understanding prior decisions will save you time.
2. **IPC is the boundary.** Renderer code must not access the database or filesystem directly — everything goes through `window.walnut.*` IPC.
3. **No UI library.** Components use inline styles and CSS custom properties (`var(--color-accent)`, `var(--space-lg)`). Keep new components consistent with existing ones.
4. **Tests are expected.** Unit tests live alongside source files. E2E tests cover critical flows. PRs without tests for new behaviour will be asked to add them.
5. **Audit events matter.** If your change affects data (imports, edits, category/rule mutations), the appropriate audit event should be emitted.

To get started:

```bash
# Fork, clone, install
git checkout -b feature/your-feature-name
npm run dev:electron
# Make changes
npm run test:unit
```

Open a pull request against `release/1.1.0` for features targeting the current milestone.

---

## License

Apache License 2.0 — see [LICENSE](LICENSE) for the full text.
