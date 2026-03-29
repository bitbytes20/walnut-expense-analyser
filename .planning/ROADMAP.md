# Roadmap: Walnut Expense Analyser

**Created:** 2026-03-27
**Roadmap shape:** Foundation -> Core -> Smart
**v1 requirement coverage:** 34 / 34 mapped

## Release 1: Foundation

Trusted import-to-insight loop for a single ICICI account profile on a local Windows desktop app.

| # | Phase | Goal | Requirements |
|---|-------|------|--------------|
| 1 | Product Shell and Security | Establish the local app shell, guided onboarding, account profile, PIN protection, and recovery posture | ONBD-01, SECU-01, SECU-02, ACCT-01 |
| 2 | Statement Import Pipeline | Build the strict ICICI import flow and record-only persistence model with hard duplicate blocking | IMPT-01, IMPT-02, IMPT-03, IMPT-04 |
| 3 | Review Queue and Import History | Add mixed import gating, a returnable review queue, and import history visibility | IMPT-05, IMPT-06, IMPT-07, REVW-01 |
| 4 | Transaction Ledger and Search | Normalize transaction types, support editing/tags, and deliver advanced transaction search/filtering | TRAN-01, TRAN-02, TRAN-04, TRAN-05 |
| 5 | Categories and Rules | Ship starter categories/rules, user-rule precedence, and user-category management | CATR-01, CATR-02, CATR-03, CATR-04, CATR-05, CATR-06 |
| 6 | Dashboard Analytics | Deliver the premium dashboard, date-range controls, theme-ready presentation, and fast insight interactions | DASH-01, DASH-02, DASH-03, DASH-04 |
| 7 | 1/4 | In Progress|  |
| 8 | Settings and Release Hardening | Complete owner settings, backup/restore, feature flags, reset controls, accessibility, and overall release readiness | SECU-03, SETG-01, ACCS-01 |

## Release 2: Core

Polish and hardening once the trusted local loop is working end-to-end.

| # | Phase | Goal | Planned Scope |
|---|-------|------|---------------|
| 9 | Workflow Polish | Improve review throughput, search ergonomics, and import troubleshooting speed | Review-flow polish, saved filter quality, clearer edge-case UX |
| 10 | Rule System Expansion | Strengthen categorization controls and operational safety for daily use | Richer rule authoring, merge safety, category/rule maintenance tools |
| 11 | Budgeting Foundations | Begin budgeting only after trust in import and categorization is proven | Budget models, category targets, variance reporting |

## Release 3: Smart

Future-facing expansion once the local foundation and core workflows are stable.

| # | Phase | Goal | Planned Scope |
|---|-------|------|---------------|
| 12 | AI Summaries | Add lightweight AI narrative summaries behind owner-controlled feature flags | Ephemeral dashboard summaries, safe controls, audit-friendly integration |
| 13 | Expansion Architecture | Prepare for additional banks, sync, web, and mobile clients without destabilizing the local core | Additional-bank abstractions, sync planning, shared-domain extraction |

## Phase Details

### Phase 1: Product Shell and Security

**Goal:** Create the desktop shell and first-run experience that establishes trust, device ownership, and the single-account posture.

**Requirements:** ONBD-01, SECU-01, SECU-02, ACCT-01

**Plans:** 3 plans
**Status:** Complete (2026-03-27)

Plans:
- [x] `01-01-PLAN.md` - Bootstrap the Electron desktop shell, persistence layer, and shared phase contracts
- [x] `01-02-PLAN.md` - Implement the persisted onboarding wizard, recovery confirmation, and empty-dashboard handoff
- [x] `01-03-PLAN.md` - Implement PIN lock enforcement, lock-screen UX, and recovery-key reset

**Success criteria**
1. First launch routes the owner through guided onboarding instead of dropping into an incomplete shell.
2. The app enforces a 6+ digit PIN on launch and idle re-entry.
3. Recovery-key confirmation is mandatory before onboarding can finish.
4. The app stores one ICICI account profile as the only release-1 account target.

**UI hint:** yes

### Phase 2: Statement Import Pipeline

**Goal:** Build a narrow but trustworthy statement-ingestion system for known ICICI exports.

**Requirements:** IMPT-01, IMPT-02, IMPT-03, IMPT-04

**Plans:** 3 plans
**Status:** Complete (2026-03-27)

Plans:
- [x] `02-01-PLAN.md` - Define import contracts and build the fixture-backed ICICI staging/parser foundation
- [x] `02-02-PLAN.md` - Implement record-only persistence, duplicate-safe commit flow, and lazy account creation
- [x] `02-03-PLAN.md` - Build the staged import workspace, summary flow, and import e2e coverage

**Success criteria**
1. Supported ICICI CSV/XLS/XLSX files import successfully.
2. Unsupported variants fail clearly without partial silent corruption.
3. Uploaded files are not retained in app storage after parsing.
4. Clear duplicate imports are blocked automatically.

**UI hint:** yes

### Phase 3: Review Queue and Import History

**Goal:** Handle ambiguity explicitly so import trust is preserved even when parsing confidence is not perfect.

**Requirements:** IMPT-05, IMPT-06, IMPT-07, REVW-01

**Plans:** 4 plans
**Status:** Complete (2026-03-27)

Plans:
- [x] `03-01-PLAN.md` - Persist review items and import attempts with severity-aware mixed import gating
- [x] `03-02-PLAN.md` - Expose import history and batch detail as trustworthy all-attempt receipt views
- [x] `03-03-PLAN.md` - Implement auditable review mutations and persisted soft-restore backend flows
- [x] `03-04-PLAN.md` - Build the dedicated review queue UI, batch re-entry, and end-to-end restore coverage

**Success criteria**
1. Ambiguous duplicates or parser uncertainties are sent to review rather than guessed silently.
2. Critical issues block import completion while lower-risk items can remain unresolved.
3. Users can revisit a dedicated review queue later and continue triage.
4. Import history records batch outcomes, counts, and errors.

**UI hint:** yes

### Phase 4: Transaction Ledger and Search

**Goal:** Make imported data explorable and editable enough to support real analysis.

**Requirements:** TRAN-01, TRAN-02, TRAN-04, TRAN-05

**Plans:** 4 plans
**Status:** Complete (2026-03-28)

Plans:
- [x] `04-01-PLAN.md` - Extend transaction contracts, normalization, and repository query foundations
- [x] `04-02-PLAN.md` - Build the ledger workspace, search bar, and advanced filter drawer
- [x] `04-03-PLAN.md` - Deliver the transaction detail drawer, immediate-save edits, and rule-suggestion hook
- [x] `04-04-PLAN.md` - Add repository, renderer, and end-to-end ledger verification coverage

**Success criteria**
1. Transactions are normalized into the product's supported financial types.
2. Users can edit key fields required to correct parser output.
3. Users can add freeform tags to support their own retrieval habits.
4. Search and filtering support both broad exploration and precise narrowing.

**UI hint:** yes

### Phase 5: Categories and Rules

**Goal:** Provide strong categorization defaults without removing user control.

**Requirements:** CATR-01, CATR-02, CATR-03, CATR-04, CATR-05, CATR-06

**Plans:** 4 plans
**Status:** Complete (2026-03-28)

Plans:
- [x] `05-01-PLAN.md` - Create the protected taxonomy foundation, durable category ids, and safe category-management repository flows
- [x] `05-02-PLAN.md` - Implement the deterministic rule engine, preview-first bulk apply flows, and transaction rule-suggestion handoff
- [x] `05-03-PLAN.md` - Build the dual-pane Categories & Rules workspace, side-panel editors, and in-context previews
- [x] `05-04-PLAN.md` - Add repository, renderer, and end-to-end verification plus the formal Phase 5 handoff

**Success criteria**
1. Built-in categories and starter rules work on realistic imported data.
2. User rules override heuristics consistently.
3. User-created categories can be managed without damaging built-in categories.
4. Income can be meaningfully categorized instead of remaining a generic bucket.

**UI hint:** yes

### Phase 6: Dashboard Analytics

**Goal:** Turn trusted local data into fast, premium-feeling insight views.

**Requirements:** DASH-01, DASH-02, DASH-03, DASH-04

**Plans:** 4 plans
**Status:** Complete (2026-03-28)

Plans:
- [x] `06-01-PLAN.md` - Create the dashboard contracts, aggregate snapshot queries, recurring detection, and persisted dashboard preferences
- [x] `06-02-PLAN.md` - Build the dashboard workspace, global controls, summary rows, and compact-mode layout
- [x] `06-03-PLAN.md` - Implement recurring detail, recent/largest widgets, and dashboard drill-down into the ledger
- [x] `06-04-PLAN.md` - Add repository, renderer, and end-to-end dashboard verification plus the formal handoff

**Success criteria**
1. Dashboard surfaces category, merchant, recurring, trend, and transaction insight blocks.
2. Users can switch between week, month, year, all-time, and custom ranges.
3. Interaction feels near-instant on expected local datasets.
4. Both light and dark mode remain usable and visually intentional.

**UI hint:** yes

### Phase 7: Audit and Diagnostics

**Goal:** Ensure every important system or user action can be understood and supported later.

**Requirements:** TRAN-03, AUDT-01, SUPP-01, SUPP-02, CRSH-01

**Success criteria**
1. Transaction edits and operational actions produce durable audit events.
2. Audit screen acts as a full event ledger rather than a narrow edit history.
3. Users can create a safe redacted diagnostics bundle.
4. Full local diagnostics and crash reports stay on-device unless intentionally shared.

**UI hint:** yes

### Phase 8: Settings and Release Hardening

**Goal:** Complete owner controls and quality rails needed to treat release 1 as a cohesive product.

**Requirements:** SECU-03, SETG-01, ACCS-01

**Success criteria**
1. Owner settings expose backup/restore, diagnostics, feature flags, theme, lock timing, and reset tools.
2. Backup/restore is manual and encrypted.
3. Keyboard navigation and shortcuts cover core app workflows.
4. Release quality gates cover privacy, accessibility, and stability expectations.

**UI hint:** yes

## Traceability Summary

- Release 1 Foundation: 34 requirements
- Release 2 Core: future scope only
- Release 3 Smart: future scope only
- All v1 requirements map to exactly one phase

## Next Step

Next recommended command: `$gsd-discuss-phase 7`

---
*Last updated: 2026-03-28 after Phase 6 execution*
