# Phase 2: Statement Import Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 02-statement-import-pipeline
**Areas discussed:** Import Entry Flow, Format Detection and Validation, Parsed Transaction Shape, Duplicate Blocking Strategy

---

## Import Entry Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard empty state only | Keep import initiation limited to the post-onboarding dashboard CTA | |
| Dashboard plus a top-level import action | Allow import from the dashboard and a global import trigger | |
| Dedicated Import Statements screen as the primary place, with dashboard shortcuts | Provide a dedicated import workspace while keeping dashboard shortcuts | |
| Multiple file selection | Allow more than one statement file in a single action | ✓ |
| Immediate parse attempt with progress UI | Begin parsing as soon as file selection completes | |
| Pre-import confirmation screen | Show detected file details before parsing | |
| Lightweight staging step | Stage selected files before parsing begins | ✓ |
| Auto-create account profile silently | Create the skipped account profile with no user confirmation | |
| Auto-create account profile with confirmation summary | Create the account profile and then summarize/confirm it | ✓ |
| Pause after parse for account confirmation | Require account confirmation before records are saved | |

**User's choice:** Import should start from both the dashboard empty state and the dedicated Import Statements screen, support multi-file selection, land on a lightweight staging screen, and auto-create a skipped account profile with a confirmation summary after first successful import.
**Notes:** The user explicitly chose both dashboard and dedicated import-screen entry points rather than a single launch surface.

---

## Format Detection and Validation

| Option | Description | Selected |
|--------|-------------|----------|
| Exact known ICICI template only | Accept only one strict known export layout | |
| Known template plus minor harmless tolerance | Allow only small header/spacing variance | |
| Best-effort parsing if key columns are recognizable | Accept statements when essential ICICI columns can be mapped reliably | ✓ |
| Simple unsupported-format error | Generic rejection message | |
| Exact reason only | Rejection explains what failed | |
| Exact reason plus supported-export guidance | Rejection explains the failure and shows what is supported | ✓ |
| First worksheet only | Parse only the first sheet if it matches | |
| Auto-detect matching worksheet | Pick the best matching sheet automatically | |
| Ask the user to pick a sheet | Let the user choose when multiple sheets look plausible | ✓ |
| Block the whole batch on one invalid file | Fail the batch if any file is invalid | |
| Import valid files and reject invalid ones individually | Allow partial batch progress with per-file rejection | ✓ |
| Stage everything for manual choice before parse | Require the user to explicitly continue per file | |

**User's choice:** Use best-effort parsing against recognizable key ICICI columns, provide exact rejection reasons plus guidance, ask for sheet selection when Excel files have multiple plausible sheets, and continue valid files even when some files in the batch are invalid.
**Notes:** The user preferred trust through specific errors and per-file handling over strict all-or-nothing batch failure.

---

## Parsed Transaction Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve recommended raw field set | Keep date, value date, narration, debit, credit, balance, reference fields, and import metadata | ✓ |
| Derive basic debit/credit direction now | Normalize direction without making richer spending-type guesses | ✓ |
| Derive richer type hints now | Try to infer expense, income, transfer candidates during import | |
| Keep only raw fields for now | Defer even debit/credit direction normalization | |
| Preserve raw narration only | Keep only the institution-provided text | |
| Preserve raw narration plus cleaned display description | Keep canonical raw text and a UI-friendly display form | ✓ |
| Preserve cleaned description only | Discard raw narration in favor of cleaned text | |
| No balance checking yet | Skip balance continuity validation entirely | |
| Soft-check balance continuity | Warn on suspicious discontinuities without hard-failing | ✓ |
| Hard-fail on balance mismatch | Reject the file when balances do not reconcile | |

**User's choice:** Follow the recommended transaction-shape approach.
**Notes:** Recommendations were grounded in common transaction-data models such as Plaid and Teller: preserve the full raw field set, derive only debit/credit direction now, keep both raw and cleaned descriptions, and soft-check balance continuity rather than hard-failing.

---

## Duplicate Blocking Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Exact same file fingerprint only | Block duplicates only when the file content matches exactly | |
| Exact same normalized transactions only | Block duplicates only from transaction-content matching | |
| Both file-level and transaction-level matching | Use both file fingerprints and normalized transaction matching | ✓ |
| Renamed same file still blocked | Detect duplicate content regardless of filename | ✓ |
| Strict exact transaction matching only | Require exact normalized equality | |
| Exact matching with small formatting tolerance | Allow harmless formatting differences while still treating the batch as duplicate | ✓ |
| Broader fuzzy matching | Use aggressive duplicate inference | |
| Simple blocked message | Only say the file is a duplicate | |
| Blocked message with reason and prior import reference | Include context but no path into the prior batch | |
| Blocked message with reason, prior import reference, and inspect option | Explain the block and offer inspection of the earlier batch | ✓ |

**User's choice:** Use both file-level and transaction-level duplicate blocking, still block renamed re-imports, use exact matching with small formatting tolerance, and show a duplicate message that includes the reason, earlier import reference, and an inspect option.
**Notes:** The user chose an investigable duplicate experience rather than a silent or opaque hard stop.

---

## the agent's Discretion

- Exact visual design of the staging screen and per-file state presentation
- Exact duplicate fingerprinting algorithm and tolerance implementation details
- Exact cleaned-description normalization rules
- Exact soft-balance-check thresholds and warning language

## Deferred Ideas

- Ambiguous duplicate review and parser-confidence triage belong to Phase 3
- Rich import history browsing beyond the minimum duplicate reference belongs to Phase 3
