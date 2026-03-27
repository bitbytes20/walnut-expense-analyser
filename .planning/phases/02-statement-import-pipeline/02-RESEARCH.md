# Phase 2: Statement Import Pipeline - Research

**Researched:** 2026-03-27
**Domain:** Electron statement ingestion, spreadsheet parsing, local SQLite persistence
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Import Entry Flow
- **D-01:** Import should be launchable from both the dashboard empty state and the dedicated Import Statements screen.
- **D-02:** Phase 2 should allow selecting multiple statement files in one import action.
- **D-03:** After file selection, imports should first enter a lightweight staging step before parsing starts.
- **D-04:** If onboarding account setup was skipped, the first successful import should auto-create the account profile and then show a confirmation summary to the owner.

### Format Detection and Validation
- **D-05:** Phase 2 should use best-effort parsing as long as the key ICICI columns are recognizable, rather than requiring an exact export template match.
- **D-06:** Rejection errors should explain the exact reason for rejection and include guidance describing what supported exports look like.
- **D-07:** For Excel files, if multiple worksheets look plausible, the app should ask the user to choose which sheet to parse.
- **D-08:** In a multi-file selection, valid files should continue through the flow while invalid files are rejected individually rather than blocking the entire batch.

### Parsed Transaction Shape
- **D-09:** Phase 2 should preserve these raw fields from the statement when available: transaction date, value date, raw narration/description, debit amount, credit amount, running balance, statement reference or cheque or transaction ID, source file identifier, and import batch identifier.
- **D-10:** Phase 2 should derive only a basic debit/credit direction during normalization and should defer richer financial typing like expense, income, or transfer classification to later phases.
- **D-11:** The import model should preserve both the original raw narration and a cleaned display description for UI readability.
- **D-12:** Parse-time validation should perform a soft balance continuity check and flag suspicious discontinuities without hard-failing the import.

### Duplicate Blocking Strategy
- **D-13:** Clear duplicate blocking should use both file-level fingerprinting and transaction-level matching.
- **D-14:** The app should still block a re-imported statement even if the same file has been renamed.
- **D-15:** Transaction-level duplicate matching should use exact matching plus a small tolerance for harmless formatting differences.
- **D-16:** When a duplicate is blocked, the app should show the reason, reference the earlier import batch, and offer a way to inspect that earlier batch.

### Claude's Discretion
- Exact visual structure of the staging step as long as it keeps the premium finance-dashboard feel and clearly separates ready, invalid, and duplicate files
- Exact normalization heuristics for cleaned display descriptions, provided the raw narration remains canonical
- Exact fingerprint implementation details for file-level and transaction-level duplicate detection
- Exact thresholds for balance soft-check warnings and formatting-tolerance comparisons

### Deferred Ideas (OUT OF SCOPE)
- Ambiguous duplicate resolution and parser-confidence review handling belong to Phase 3: Review Queue and Import History.
- Batch-level history browsing and deep inspection UIs belong to Phase 3 beyond the minimum prior-batch reference needed for duplicate blocking.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IMPT-01 | User can import supported ICICI statements from CSV, XLS, and XLSX files. | Use one main-process parser stack that covers all three formats, stage files before parse, and require fixture-backed tests for each format. |
| IMPT-02 | App rejects unsupported or variant statement formats with clear errors. | Detect recognizable ICICI headers before normalization, return explicit reason codes, and keep per-file rejection state visible through staging and summary. |
| IMPT-03 | App stores parsed records and import metadata only, and does not retain uploaded statement files. | Read files only in the main process, persist normalized records plus batch/file metadata, and never copy source files into app storage. |
| IMPT-04 | App blocks clear duplicate imports automatically. | Use SHA-256 file fingerprints plus normalized transaction signatures in SQLite-backed duplicate checks before persistence. |
</phase_requirements>

## Summary

Plan Phase 2 as a main-process import service, not a renderer feature with file access. The renderer should own the staged batch UX, but all file selection, workbook reads, CSV/XLS/XLSX parsing, duplicate checks, and persistence should stay behind preload IPC in the same pattern already used for onboarding and security. That matches the current Electron boundary, keeps statement bytes out of the browser context, and makes the "records only, no file retention" rule enforceable.

Use one parser stack for all required file types. The narrowest workable choice is `xlsx` for CSV/XLS/XLSX ingestion, plus explicit ICICI header matching, explicit date and amount normalization, and SQLite-backed duplicate keys. Do not plan a generic import mapper. This phase is a trusted ICICI pipeline with clear rejection reasons, sheet-choice handling for Excel, and durable batch metadata that Phase 3 can extend into review/history.

The main planning risk is fixture quality, not UI complexity. There are no sample ICICI statements in the repo today. Treat golden import fixtures for known-good CSV/XLS/XLSX and at least one unsupported variant as Wave 0 assets, otherwise the parser and duplicate logic will drift into guesswork.

**Primary recommendation:** Build a main-process `import` module around `xlsx` + SQLite transactions + SHA-256 duplicate keys, and gate planning on adding real ICICI fixture files first.

## Project Constraints (from AGENTS.md)

- Use GSD phase flow rather than ad hoc execution when possible.
- Keep documentation current after every feature and bug fix.
- Maintain a full test pyramid for all implemented work.
- Prefer modular boundaries between domain logic, parsing, persistence, and UI so future web/mobile clients stay feasible.
- Release 1 is Windows desktop only.
- Core flows must work offline.
- Never retain uploaded statement files after parsing.
- Favor parsing correctness over aggressive guessing.
- User rules always override heuristics.
- Built-in categories are protected; user-created categories are manageable.
- Auditability and privacy are first-class requirements, not polish.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `xlsx` | `0.18.5` | Read CSV, XLS, and XLSX in one Node/Electron parser path | One library covers the exact Phase 2 file formats, includes Node/Electron usage patterns, and exposes workbook + worksheet APIs for sheet-choice staging. |
| `date-fns` | `4.1.0` | Parse and normalize statement dates explicitly | Avoids locale-dependent `Date` parsing and keeps date-format handling testable and deterministic. |
| `better-sqlite3` | `11.8.1` | Persist import batches, files, and transactions atomically | Already established in the repo and fits the offline local-first model with explicit transactions and indexes. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | `4.3.6` | Validate parsed row shapes and IPC payloads with structured errors | Use at parser boundaries when you need precise reject reasons and stable shared contracts. |
| `csv-parse` | `6.2.1` | Fallback CSV parser with detailed quoting/delimiter diagnostics | Use only if real ICICI CSV fixtures show `xlsx` CSV ingestion is too lossy or error reporting is too weak. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `xlsx` | `exceljs` | `exceljs` is strong for modern workbook workflows, but its official package surface does not make Phase 2's CSV/XLS/XLSX single-parser requirement the obvious fit. |
| `date-fns` | `new Date(raw)` | Native parsing is too locale-sensitive for bank statements and creates avoidable false rejects or silent mis-parses. |
| `zod` | ad hoc type guards | Custom guards are lighter up front, but they usually degrade into inconsistent rejection messages across CSV/XLS/XLSX paths. |

**Installation:**
```bash
npm install xlsx date-fns zod
```

`csv-parse` is optional support, not part of the first pass:

```bash
npm install csv-parse
```

**Version verification:** Verified from npm registry on 2026-03-27.

- `xlsx@0.18.5` published 2022-03-24, registry modified 2024-10-22
- `date-fns@4.1.0` published 2024-09-17
- `zod@4.3.6` published 2026-01-22
- `csv-parse@6.2.1` published 2026-03-20

**Planning caveat:** `xlsx` remains the official npm package, but its npm release line is older than newer SheetJS-hosted builds. Treat that as a medium-confidence ecosystem risk and pin the version explicitly.

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── main/import/                # file dialog, parser orchestration, duplicate service
├── main/persistence/           # schema + repository methods for batches/files/transactions
├── shared/contracts/import.ts  # IPC-safe batch/file/result contracts
├── renderer/features/import/   # workspace, staging rows, sheet picker, summary
└── renderer/mock/import/       # mock IPC behavior mirroring real import contracts
tests/
├── fixtures/import/            # real ICICI sample files + expected outputs
├── unit/import/                # parser, duplicate, and repository tests
└── e2e/                        # staged import workspace flow
```

### Pattern 1: Main-Owned File Acquisition
**What:** The renderer requests import actions, but the main process opens the file picker and reads the files.
**When to use:** For every statement selection, sheet-preview request, and final import action.
**Example:**
```ts
// Pattern source: existing preload + ipc registration in src/preload/index.ts
// and src/main/ipc/app-state.ts
ipcMain.handle('import:stage-files', async () => {
  // 1. showOpenDialog in main
  // 2. read selected files in main
  // 3. return staged file metadata only
})
```

### Pattern 2: Two-Phase Batch Pipeline
**What:** Split work into `stage` and `commit`.
**When to use:** Always. Stage detects file type, plausible sheets, parseability, and duplicate state before any records are persisted.
**Example:**
```ts
type StagedFileState =
  | 'ready'
  | 'needs-sheet-selection'
  | 'rejected'
  | 'duplicate-blocked'

// stage: detect format, inspect workbook headers, compute duplicate candidates
// commit: parse selected sheet, normalize rows, validate, then persist in one SQLite transaction
```

### Pattern 3: Preserve Raw Fields, Derive Minimal Normalization
**What:** Store canonical raw values from the statement plus only the minimal Phase 2 derived fields.
**When to use:** For every imported transaction row.
**Example:**
```ts
interface ImportedStatementRow {
  transactionDateRaw: string
  valueDateRaw?: string
  rawNarration: string
  cleanedDescription: string
  debitAmountMinor?: number
  creditAmountMinor?: number
  runningBalanceMinor?: number
  direction: 'debit' | 'credit'
  sourceFileId: string
  importBatchId: string
}
```

### Pattern 4: Duplicate Checks Before Persistence
**What:** Compute file fingerprints and transaction signatures during staging, then confirm again in the same transaction that writes the batch.
**When to use:** For every file, even in multi-file imports.
**Example:**
```ts
// file duplicate: sha256(original bytes)
// transaction duplicate: sha256(date + valueDate + amount + normalizedNarration + reference + runningBalance?)
// both checks must resolve before INSERTs commit
```

### Anti-Patterns to Avoid
- **Renderer-side filesystem access:** It weakens the privacy boundary and breaks the repo's typed preload pattern.
- **Immediate parse after file selection:** It violates D-03 and makes per-file rejection handling much harder.
- **Generic bank-agnostic import mapping:** Phase 2 is explicitly narrow ICICI support.
- **Persisting staged file copies:** IMPT-03 forbids retained statement files.
- **Single-source duplicate logic:** Filename-only or file-hash-only checks will miss real cases the user explicitly asked to block.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV/XLS/XLSX decoding | Separate custom parsers per format | `xlsx` | Legacy XLS support and worksheet APIs are the hard part; Phase 2 needs one decoder path. |
| File fingerprints | Homegrown checksum math | `node:crypto` SHA-256 | Fast, deterministic, already standard in the repo's security code. |
| Locale-sensitive date parsing | `new Date(rawString)` | `date-fns` with explicit formats | Bank statements use human-formatted dates that native parsing can misread. |
| Parser boundary validation | Scattered `if` statements across parser code | `zod` schemas or one central validator module | Keeps rejection reasons stable and testable. |
| Duplicate enforcement | In-memory duplicate maps only | SQLite indexes + deterministic signatures | Duplicate blocking has to survive app restarts and multi-file batches. |

**Key insight:** The custom code should be ICICI-specific normalization and duplicate policy, not low-level spreadsheet parsing or hashing primitives.

## Common Pitfalls

### Pitfall 1: Parsing in the Renderer
**What goes wrong:** Statement bytes enter the browser context and file-selection logic becomes hard to test and secure.
**Why it happens:** Electron import flows are often prototyped from the UI first.
**How to avoid:** Keep file dialogs and byte reads in the main process, return staged metadata over preload IPC.
**Warning signs:** `window.showOpenFilePicker`, `FileReader`, or raw buffers appearing in renderer code.

### Pitfall 2: Treating Header Text as Exact and Stable
**What goes wrong:** Harmless spacing, case, or workbook formatting differences cause false rejects.
**Why it happens:** The parser matches one exact export template instead of recognizable ICICI columns.
**How to avoid:** Normalize headers before matching and score worksheets by required-column presence.
**Warning signs:** Support code checks exact header arrays or rejects files with only cosmetic variation.

### Pitfall 3: Floating-Point Amount Logic
**What goes wrong:** Duplicate checks and balance continuity warnings drift because `number` arithmetic introduces rounding noise.
**Why it happens:** Raw amounts are parsed into JS floats too early.
**How to avoid:** Normalize all money into integer minor units before matching or comparing.
**Warning signs:** Duplicate tolerance logic uses `0.01` comparisons everywhere.

### Pitfall 4: Duplicate Blocking Based on One Signal
**What goes wrong:** Renamed same-file imports or regenerated exports slip through, or legitimate files get blocked too aggressively.
**Why it happens:** The implementation uses only filename, only file fingerprint, or only transaction matching.
**How to avoid:** Combine file fingerprinting and normalized transaction-signature checks, and store the earlier batch reference.
**Warning signs:** Duplicate reasons cannot explain which prior batch caused the block.

### Pitfall 5: Sheet Selection After Persistence
**What goes wrong:** The system partially commits before the owner resolves worksheet ambiguity.
**Why it happens:** Worksheet detection is treated as a parser error instead of a staging state.
**How to avoid:** Resolve plausible-sheet ambiguity during staging and require an explicit sheet choice before commit.
**Warning signs:** Transactions appear before the user has chosen a worksheet.

## Code Examples

Verified patterns from official sources and current repo conventions:

### Read a Workbook and Extract Row Arrays
```ts
// Source: https://www.npmjs.com/package/xlsx
import * as XLSX from 'xlsx/xlsx.mjs'
import * as fs from 'node:fs'

XLSX.set_fs(fs)

export const loadWorksheetRows = (filePath: string, sheetName?: string) => {
  const workbook = XLSX.readFile(filePath)
  const selectedSheet = sheetName ?? workbook.SheetNames[0]
  return XLSX.utils.sheet_to_json(workbook.Sheets[selectedSheet], {
    header: 1,
    blankrows: false
  }) as unknown[][]
}
```

### Extend the Existing IPC Boundary for Import Actions
```ts
// Pattern source: src/preload/index.ts and src/main/ipc/app-state.ts
const walnutApi = {
  stageImportFiles: () => ipcRenderer.invoke('import:stage-files'),
  chooseImportSheet: (fileId: string, sheetName: string) =>
    ipcRenderer.invoke('import:choose-sheet', { fileId, sheetName }),
  commitImportBatch: (batchId: string) =>
    ipcRenderer.invoke('import:commit-batch', { batchId })
}
```

### Persist Import Results in One Transaction
```ts
// Source pattern: existing better-sqlite3 repository in src/main/persistence/db.ts
const txn = sqlite.transaction((batch, files, rows) => {
  insertBatch.run(batch)
  for (const file of files) insertFile.run(file)
  for (const row of rows) insertTransaction.run(row)
})

txn(batchRecord, fileRecords, transactionRows)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Parse immediately after file pick | Stage first, then commit | Current project decision in Phase 2 context | Better per-file trust, clearer rejection UX, cleaner worksheet resolution |
| Filename-based duplicate checks | Content fingerprint + normalized transaction signatures | Current best practice for local import systems | Blocks renamed re-imports and explains why |
| Exact-template import acceptance | Recognizable-column detection with explicit rejection reasons | Current project decision in Phase 2 context | Narrow support stays trustworthy without brittle cosmetic failures |

**Deprecated/outdated:**
- Persisting imported source files: explicitly forbidden by IMPT-03 and project privacy guardrails.
- Renderer-owned import parsing: contradicts the repo's current preload/main boundary.

## Open Questions

1. **Where are the real ICICI sample fixtures?**
   - What we know: The repo has no sample CSV/XLS/XLSX files or expected parser outputs.
   - What's unclear: Exact header variants, date formats, amount formatting, and narration quirks across the user's exports.
   - Recommendation: Make fixture acquisition a Wave 0 prerequisite for planning.

2. **What money unit should Phase 2 persist for imported amounts?**
   - What we know: Existing SQLite schema already uses `INTEGER` for `opening_balance`.
   - What's unclear: Whether imported transaction amounts should use paise/minor units consistently from day one.
   - Recommendation: Plan on integer minor units now to avoid later migration churn.

3. **How should the “View earlier batch” action resolve before Phase 3 history exists?**
   - What we know: Phase 2 must offer an inspect path, but deep history browsing is deferred.
   - What's unclear: Whether that path is an inline summary panel, a lightweight detail drawer, or a minimal batch detail route.
   - Recommendation: Keep it inside the import workspace with a lightweight prior-batch detail panel backed by stored batch/file metadata.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Electron/Vite/Vitest runtime | ✓ | `v22.16.0` | — |
| npm | Package install and scripts | ✓ | `10.9.2` | Use `cmd /c npm ...` in PowerShell if execution policy blocks direct `npm` |
| Vitest CLI | Phase unit tests | ✓ | `3.2.4` | `npm run test:unit` |
| Playwright CLI | Import-flow e2e | ✓ | `1.58.2` | Use unit + integration coverage first if browser validation is delayed |

**Missing dependencies with no fallback:**
- None identified for planning.

**Missing dependencies with fallback:**
- Direct PowerShell `npm` invocation is blocked by execution policy on this machine; invoking through `cmd /c npm ...` works.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `3.2.4` + Playwright CLI available |
| Config file | `vitest.config.ts`, `playwright.config.ts` |
| Quick run command | `npx vitest run tests/unit/import/*.test.ts` |
| Full suite command | `cmd /c npm run test:unit` and `npx playwright test tests/e2e/import-flow.spec.ts` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IMPT-01 | Supported ICICI CSV/XLS/XLSX imports stage and parse correctly | unit + e2e | `npx vitest run tests/unit/import/parser.test.ts` | ❌ Wave 0 |
| IMPT-02 | Unsupported variants reject with exact reasons | unit | `npx vitest run tests/unit/import/rejections.test.ts` | ❌ Wave 0 |
| IMPT-03 | Source files are not persisted, only records + metadata are stored | unit | `npx vitest run tests/unit/import/persistence.test.ts` | ❌ Wave 0 |
| IMPT-04 | Clear duplicates are blocked automatically and reference prior batch | unit + e2e | `npx vitest run tests/unit/import/duplicates.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/unit/import/*.test.ts`
- **Per wave merge:** `cmd /c npm run test:unit`
- **Phase gate:** `cmd /c npm run test:unit` plus `npx playwright test tests/e2e/import-flow.spec.ts`

### Wave 0 Gaps
- [ ] `tests/fixtures/import/` — real known-good ICICI CSV, XLS, XLSX, plus at least one unsupported variant
- [ ] `tests/unit/import/parser.test.ts` — format detection, header mapping, worksheet ambiguity
- [ ] `tests/unit/import/duplicates.test.ts` — file fingerprint and transaction-signature blocking
- [ ] `tests/unit/import/persistence.test.ts` — record-only storage and batch/file metadata persistence
- [ ] `tests/unit/import/rejections.test.ts` — exact rejection reason coverage
- [ ] `tests/e2e/import-flow.spec.ts` — staged batch flow, worksheet choice, duplicate/reject summary

## Sources

### Primary (HIGH confidence)
- Local repo files:
  - `AGENTS.md`
  - `.planning/PROJECT.md`
  - `.planning/ROADMAP.md`
  - `.planning/REQUIREMENTS.md`
  - `.planning/STATE.md`
  - `.planning/config.json`
  - `.planning/phases/02-statement-import-pipeline/02-CONTEXT.md`
  - `.planning/phases/02-statement-import-pipeline/02-UI-SPEC.md`
  - `src/main/persistence/db.ts`
  - `src/main/persistence/schema.ts`
  - `src/preload/index.ts`
  - `src/main/ipc/app-state.ts`
  - `src/shared/contracts/account.ts`
  - `src/shared/contracts/app-state.ts`
  - `src/renderer/App.tsx`
  - `src/renderer/mockWalnutApi.ts`
  - `src/renderer/features/dashboard/EmptyDashboard.tsx`
  - `vitest.config.ts`
  - `playwright.config.ts`
  - `package.json`
- `https://www.npmjs.com/package/xlsx` - official package surface and README-backed Node/Electron workbook parsing
- `https://www.npmjs.com/package/date-fns` - current package version verification
- `https://www.npmjs.com/package/zod` - current package version verification
- `https://www.npmjs.com/package/csv-parse` - current package version verification and official readme links

### Secondary (MEDIUM confidence)
- `https://sheetjs.com/` - official project homepage; used only to confirm package ownership context
- `https://csv.js.org/parse/` - official CSV Parse documentation link surfaced from the package readme
- `https://www.npmjs.com/package/exceljs` - official package scope used only for alternative comparison

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - versions were verified from npm, but the `xlsx` npm line is older than newer SheetJS-hosted builds.
- Architecture: HIGH - directly constrained by locked phase decisions, approved UI contract, and the repo's current preload/main/persistence patterns.
- Pitfalls: MEDIUM - grounded in finance-import implementation practice and current project constraints, but not yet validated against real ICICI fixtures in-repo.

**Research date:** 2026-03-27
**Valid until:** 2026-04-03
