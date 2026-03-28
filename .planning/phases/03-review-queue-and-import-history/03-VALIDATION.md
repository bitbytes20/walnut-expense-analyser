---
phase: 03
slug: review-queue-and-import-history
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-27
---

# Phase 03 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 + Playwright 1.55.0 |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `cmd /c npx vitest run tests/unit/import/*.test.ts tests/unit/*review*.test.tsx` |
| **Full suite command** | `cmd /c npm run test:unit` and `cmd /c npx playwright test tests/e2e/import-flow.spec.ts tests/e2e/review-queue.spec.ts` |
| **Estimated runtime** | ~75 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task-local Vitest command declared in the active plan.
- **After every plan wave:** Run `cmd /c npm run test:unit`
- **Before `$gsd-verify-work`:** Full unit suite plus `cmd /c npx playwright test tests/e2e/review-queue.spec.ts`
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | IMPT-05 | unit | `cmd /c npx vitest run tests/unit/import/review-routing.test.ts tests/unit/import/review-gating.test.ts` | No - W0 | pending |
| 03-01-02 | 01 | 1 | IMPT-06 | unit | `cmd /c npx vitest run tests/unit/import/review-routing.test.ts tests/unit/import/review-gating.test.ts` | No - W0 | pending |
| 03-02-01 | 02 | 2 | IMPT-07 | unit | `cmd /c npx vitest run tests/unit/import/history-repository.test.ts` | No - W0 | pending |
| 03-02-02 | 02 | 2 | IMPT-07 | unit | `cmd /c npx vitest run tests/unit/import-history.test.tsx tests/unit/import/history-repository.test.ts` | No - W0 | pending |
| 03-03-01 | 03 | 3 | REVW-01 | unit | `cmd /c npx vitest run tests/unit/import/review-mutations.test.ts` | No - W0 | pending |
| 03-04-01 | 04 | 4 | REVW-01 | unit + e2e | `cmd /c npx vitest run tests/unit/review-queue.test.tsx tests/unit/import/review-mutations.test.ts && cmd /c npx playwright test tests/e2e/review-queue.spec.ts` | No - W0 | pending |

---

## Wave 0 Requirements

- [ ] `tests/unit/import/review-routing.test.ts` - unresolved-item creation by reason and severity
- [ ] `tests/unit/import/review-gating.test.ts` - blocking versus warning completion behavior
- [ ] `tests/unit/import/history-repository.test.ts` - import attempt history, counts, and detail queries
- [ ] `tests/unit/import-history.test.tsx` - import history and batch-detail renderer coverage
- [ ] `tests/unit/import/review-mutations.test.ts` - atomic resolution, audit emission, and restore tests
- [ ] `tests/unit/review-queue.test.tsx` - grouped unresolved queue, protected fields, and refetch-after-mutation behavior
- [ ] `tests/e2e/review-queue.spec.ts` - reopen unresolved batch, partial resolution, restore, and live count refresh

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Native desktop relaunch preserves pending review items and restore affordances | REVW-01 | Playwright can cover browser-harness behavior, but relaunch persistence is highest-trust on native desktop | Run the desktop shell, import a batch that lands in `Needs review`, close the app, relaunch, and confirm the same unresolved items and restore metadata remain available |
| Import history receipt remains readable in both light and dark theme | IMPT-07 | Visual hierarchy and trust affordances are easier to confirm interactively | Open history and batch detail in both themes and verify status badges, unresolved counts, and primary review actions remain legible and clearly prioritized |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verification commands
- [x] Sampling continuity is preserved across waves
- [x] Wave 0 gaps are explicitly listed
- [x] No watch-mode commands are used
- [x] Feedback latency stays under the phase target
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
