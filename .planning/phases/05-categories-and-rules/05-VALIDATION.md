---
phase: 05
slug: categories-and-rules
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-28
---

# Phase 05 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 + Playwright 1.55.0 |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `cmd /c npx vitest run tests/unit/categories/*.test.ts tests/unit/categories-rules-screen.test.tsx` |
| **Full suite command** | `cmd /c npm run test:unit` and `cmd /c npx playwright test tests/e2e/categories-rules.spec.ts` |
| **Estimated runtime** | ~95 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task-local Vitest command declared in the active plan.
- **After every plan wave:** Run `cmd /c npm run test:unit`
- **Before `$gsd-verify-work`:** Full unit suite plus `cmd /c npx playwright test tests/e2e/categories-rules.spec.ts`
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | CATR-02, CATR-05, CATR-06 | unit | `cmd /c npx vitest run tests/unit/categories/category-repository.test.ts tests/unit/categories/rule-engine.test.ts` | No - W0 | pending |
| 05-01-02 | 01 | 1 | CATR-01, CATR-04 | unit | `cmd /c npx vitest run tests/unit/categories/category-repository.test.ts tests/unit/categories/rule-engine.test.ts` | No - W0 | pending |
| 05-02-01 | 02 | 2 | CATR-01, CATR-03, CATR-06 | unit | `cmd /c npx vitest run tests/unit/categories/rule-engine.test.ts tests/unit/categories/rule-preview.test.ts` | No - W0 | pending |
| 05-02-02 | 02 | 2 | CATR-03 | unit + component | `cmd /c npx vitest run tests/unit/categories/rule-preview.test.ts tests/unit/transactions/rule-suggestion.test.tsx` | No - W0 | pending |
| 05-03-01 | 03 | 3 | CATR-04, CATR-05 | component | `cmd /c npx vitest run tests/unit/categories-rules-screen.test.tsx` | No - W0 | pending |
| 05-03-02 | 03 | 3 | CATR-01, CATR-03, CATR-06 | component | `cmd /c npx vitest run tests/unit/categories-rules-screen.test.tsx tests/unit/transactions/rule-suggestion.test.tsx` | No - W0 | pending |
| 05-04-01 | 04 | 4 | CATR-01, CATR-02, CATR-03, CATR-04, CATR-05, CATR-06 | unit + e2e | `cmd /c npx vitest run tests/unit/categories/*.test.ts tests/unit/categories-rules-screen.test.tsx tests/unit/transactions/rule-suggestion.test.tsx && cmd /c npx playwright test tests/e2e/categories-rules.spec.ts` | No - W0 | pending |

---

## Wave 0 Requirements

- [ ] `tests/unit/categories/category-repository.test.ts` - system taxonomy seeding, user-category CRUD, move, merge, activate/deactivate, and system protection coverage
- [ ] `tests/unit/categories/rule-engine.test.ts` - deterministic specificity scoring, starter-rule application, and future-vs-previewed apply behavior
- [ ] `tests/unit/categories/rule-preview.test.ts` - apply-to-existing previews with count and sample transaction results
- [ ] `tests/unit/categories-rules-screen.test.tsx` - dual-pane Categories & Rules workspace rendering, counts, side-panel flows, and preview surfaces
- [ ] `tests/unit/transactions/rule-suggestion.test.tsx` - post-save rule suggestion flow from the transaction drawer with prefilled values
- [ ] `tests/e2e/categories-rules.spec.ts` - create category, create/test rule, preview apply-to-existing, and verify transaction categorization changes

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Protected system categories feel obviously protected while user categories still feel flexible | CATR-04, CATR-05 | Visual trust cues and edit affordances are easier to judge interactively | Open the Categories & Rules workspace in light and dark themes and verify system rows read as protected while user rows expose clear actions |
| Rule preview language makes bulk re-categorization impact easy to understand | CATR-03 | Preview clarity and transaction-sample readability are best judged by a human | Create or edit a rule, open the apply-to-existing preview, and confirm the count plus sample list clearly explain what will change |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verification commands
- [x] Sampling continuity is preserved across waves
- [x] Wave 0 gaps are explicitly listed
- [x] No watch-mode commands are used
- [x] Feedback latency stays under the phase target
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
