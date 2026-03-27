---
phase: 02
slug: statement-import-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 02 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 + Playwright 1.58.2 |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npx vitest run tests/unit/import/*.test.ts` |
| **Full suite command** | `cmd /c npm run test:unit` and `npx playwright test tests/e2e/import-flow.spec.ts` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/unit/import/*.test.ts`
- **After every plan wave:** Run `cmd /c npm run test:unit`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | IMPT-01 | unit | `npx vitest run tests/unit/import/parser.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | IMPT-02 | unit | `npx vitest run tests/unit/import/rejections.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | IMPT-03 | unit | `npx vitest run tests/unit/import/persistence.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | IMPT-04 | unit | `npx vitest run tests/unit/import/duplicates.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 3 | IMPT-01, IMPT-02, IMPT-04 | e2e | `npx playwright test tests/e2e/import-flow.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/fixtures/import/icici-valid.csv` - known-good CSV fixture
- [ ] `tests/fixtures/import/icici-valid.xls` - known-good XLS fixture
- [ ] `tests/fixtures/import/icici-valid.xlsx` - known-good XLSX fixture
- [ ] `tests/fixtures/import/icici-unsupported-variant.xlsx` - unsupported-format fixture
- [ ] `tests/unit/import/parser.test.ts` - format detection, header mapping, and worksheet ambiguity tests
- [ ] `tests/unit/import/rejections.test.ts` - exact rejection reason coverage
- [ ] `tests/unit/import/persistence.test.ts` - record-only storage and batch metadata persistence tests
- [ ] `tests/unit/import/duplicates.test.ts` - file fingerprint and transaction-signature duplicate tests
- [ ] `tests/e2e/import-flow.spec.ts` - staged batch flow, worksheet choice, and duplicate/reject summary flow

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Windows native file picker integration | IMPT-01 | Dialog invocation is OS-mediated and harder to assert end-to-end in CI | On Windows, launch the import flow from dashboard and Import Statements screen, trigger file selection, and confirm the chosen files stage correctly without renderer-side file access |
| Native Electron workbook read boundary | IMPT-03 | Browser harness tests may not fully prove main-process-only byte handling | Run the desktop shell, import a real fixture, and confirm only normalized records and import metadata appear in local SQLite without copied source files in app storage |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
