---
phase: 06
slug: dashboard-analytics
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-28
---

# Phase 06 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 + Playwright 1.55.0 |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `cmd /c npx vitest run tests/unit/dashboard/*.test.ts tests/unit/dashboard-screen.test.tsx` |
| **Full suite command** | `cmd /c npm run test:unit` and `cmd /c npx playwright test tests/e2e/dashboard-analytics.spec.ts` |
| **Estimated runtime** | ~110 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task-local Vitest command declared in the active plan.
- **After every plan wave:** Run `cmd /c npm run test:unit`
- **Before `$gsd-verify-work`:** Full unit suite plus `cmd /c npx playwright test tests/e2e/dashboard-analytics.spec.ts`
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | DASH-01, DASH-02, DASH-03 | unit | `cmd /c npx vitest run tests/unit/dashboard/dashboard-repository.test.ts tests/unit/dashboard/date-range-prefs.test.ts` | No - W0 | pending |
| 06-01-02 | 01 | 1 | DASH-01, DASH-03 | unit | `cmd /c npx vitest run tests/unit/dashboard/dashboard-repository.test.ts tests/unit/dashboard/recurring-detection.test.ts` | No - W0 | pending |
| 06-02-01 | 02 | 2 | DASH-01, DASH-02, DASH-04 | component | `cmd /c npx vitest run tests/unit/dashboard-screen.test.tsx` | No - W0 | pending |
| 06-02-02 | 02 | 2 | DASH-02, DASH-03, DASH-04 | component | `cmd /c npx vitest run tests/unit/dashboard-screen.test.tsx tests/unit/dashboard/date-range-prefs.test.ts` | No - W0 | pending |
| 06-03-01 | 03 | 3 | DASH-01, DASH-03 | component + unit | `cmd /c npx vitest run tests/unit/dashboard-screen.test.tsx tests/unit/dashboard/drilldown-query.test.ts` | No - W0 | pending |
| 06-03-02 | 03 | 3 | DASH-01 | component | `cmd /c npx vitest run tests/unit/dashboard-screen.test.tsx tests/unit/dashboard/recurring-detection.test.ts` | No - W0 | pending |
| 06-04-01 | 04 | 4 | DASH-01, DASH-02, DASH-03, DASH-04 | unit + e2e | `cmd /c npx vitest run tests/unit/dashboard/*.test.ts tests/unit/dashboard-screen.test.tsx && cmd /c npx playwright test tests/e2e/dashboard-analytics.spec.ts` | No - W0 | pending |

---

## Wave 0 Requirements

- [ ] `tests/unit/dashboard/dashboard-repository.test.ts` - dashboard snapshot aggregation, summary-card math, chart bucketing, merchant/category ranking, and previous-period comparison coverage
- [ ] `tests/unit/dashboard/date-range-prefs.test.ts` - preset/custom range persistence and compare-toggle preference behavior
- [ ] `tests/unit/dashboard/recurring-detection.test.ts` - recurring debit/credit detection heuristics and recurring-detail shaping
- [ ] `tests/unit/dashboard/drilldown-query.test.ts` - dashboard widget to ledger-query handoff coverage
- [ ] `tests/unit/dashboard-screen.test.tsx` - dashboard workspace rendering, compact mode, widget-local controls, and click-through behavior
- [ ] `tests/e2e/dashboard-analytics.spec.ts` - end-to-end range switching, comparison, drill-down, and recurring-detail behavior

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard feels premium and not visually overloaded in both standard and compact desktop widths | DASH-04 | Visual hierarchy and compact-mode quality are best judged interactively | Open the dashboard in light and dark themes at larger and smaller desktop widths and confirm the summary row, trend chart, and supporting widgets preserve a clear scan order |
| Comparison labels and recurring-detail copy are understandable without sounding speculative | DASH-01, DASH-02 | Copy clarity and trust language benefit from human review | Toggle comparisons and open a recurring-detail panel, then verify that labels stay literal and easy to trust |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verification commands
- [x] Sampling continuity is preserved across waves
- [x] Wave 0 gaps are explicitly listed
- [x] No watch-mode commands are used
- [x] Feedback latency stays under the phase target
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
