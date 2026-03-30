---
phase: 9
slug: workflow-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run tests/unit` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds (unit); ~90 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/unit`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01 | 01 | 0 | WORKFLOW-01 | unit | `npx vitest run tests/unit/transactions/multi-select.test.ts` | ❌ Wave 0 | ⬜ pending |
| 09-02 | 01 | 0 | WORKFLOW-07 | unit | `npx vitest run tests/unit/import/review-keyboard.test.ts` | ❌ Wave 0 | ⬜ pending |
| 09-03 | 01 | 0 | WORKFLOW-08,09 | unit | `npx vitest run tests/unit/filter-presets-repository.test.ts` | ❌ Wave 0 | ⬜ pending |
| 09-04 | TBD | 1 | WORKFLOW-01 | unit | `npx vitest run tests/unit/transactions/multi-select.test.ts` | ❌ Wave 0 | ⬜ pending |
| 09-05 | TBD | 1 | WORKFLOW-02,03 | unit | `npx vitest run tests/unit/transactions-repository.test.ts` | ✅ extend | ⬜ pending |
| 09-06 | TBD | 1 | WORKFLOW-04 | unit | `npx vitest run tests/unit/import/review-mutations.test.ts` | ✅ extend | ⬜ pending |
| 09-07 | TBD | 1 | WORKFLOW-05,06 | unit | `npx vitest run tests/unit/import/parser.test.ts` + `persistence.test.ts` | ✅ extend | ⬜ pending |
| 09-08 | TBD | 1 | WORKFLOW-07 | unit | `npx vitest run tests/unit/import/review-keyboard.test.ts` | ❌ Wave 0 | ⬜ pending |
| 09-09 | TBD | 1 | WORKFLOW-08,09 | unit | `npx vitest run tests/unit/filter-presets-repository.test.ts` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/transactions/multi-select.test.ts` — stubs for range-select pure logic (WORKFLOW-01)
- [ ] `tests/unit/import/review-keyboard.test.ts` — stubs for keyboard handler action dispatch and input guard (WORKFLOW-07)
- [ ] `tests/unit/filter-presets-repository.test.ts` — stubs for CRUD against `:memory:` db (WORKFLOW-08, WORKFLOW-09)

*Existing test files for WORKFLOW-02 through WORKFLOW-06 need new test cases added, not new files.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Shift+click visual range highlight in transaction table | WORKFLOW-01 | DOM interaction not covered by unit tests | Open app → import transactions → hold shift and click two rows — verify rows between are checked |
| Bulk action bar appears/hides on select/deselect | WORKFLOW-01 | Visual component state | Select ≥1 transaction → verify bar appears; deselect all → verify bar disappears |
| Import error message shows row, expected vs found, fix suggestion | WORKFLOW-05 | Rendered UI copy requires visual inspection | Import a malformed CSV → verify error card shows row number, expected format, and suggested fix |
| Filter preset round-trip in UI | WORKFLOW-08,09 | UI interaction + persistence together | Apply filters → Save preset → reload app → restore preset — verify filters match |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
