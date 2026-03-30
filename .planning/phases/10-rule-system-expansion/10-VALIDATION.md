---
phase: 10
slug: rule-system-expansion
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-30
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.2.4 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npm run rebuild:native:node && npx vitest run tests/unit/categories/` |
| **Full suite command** | `npm run test:unit` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run rebuild:native:node && npx vitest run tests/unit/categories/`
- **After every plan wave:** Run `npm run test:unit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | RULES-01..11 | tsc | `npx tsc --noEmit 2>&1 \| head -20` | ✅ | ⬜ pending |
| 10-01-02 | 01 | 1 | RULES-01..11 | tsc | `npm run rebuild:native:node && npx tsc --noEmit 2>&1 \| head -20` | ✅ | ⬜ pending |
| 10-01-03 | 01 | 1 | RULES-01..11 | unit (Wave 0) | `npm run rebuild:native:node && npx vitest run tests/unit/categories/ tests/unit/import/auto-apply.test.ts 2>&1 \| tail -20` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 2 | RULES-01,02,03,08 | unit | `npm run rebuild:native:node && npx vitest run tests/unit/categories/rule-engine.test.ts -t "Phase 10" 2>&1 \| tail -30` | ❌ W0 | ⬜ pending |
| 10-02-02 | 02 | 2 | RULES-01,02,03,08 | tsc | `npx tsc --noEmit 2>&1 \| head -20` | ✅ | ⬜ pending |
| 10-03-01 | 03 | 2 | RULES-05,06,07 | unit | `npm run rebuild:native:node && npx vitest run tests/unit/categories/category-repository.test.ts -t "Phase 10" 2>&1 \| tail -30` | ❌ W0 | ⬜ pending |
| 10-03-02 | 03 | 2 | RULES-05,06,07 | tsc | `npx tsc --noEmit 2>&1 \| head -20` | ✅ | ⬜ pending |
| 10-04-01 | 04 | 3 | RULES-04,11 | unit | `npm run rebuild:native:node && npx vitest run tests/unit/categories/rule-engine.test.ts -t "drag reorder" tests/unit/import/auto-apply.test.ts 2>&1 \| tail -30` | ❌ W0 | ⬜ pending |
| 10-04-02 | 04 | 3 | RULES-04,11 | tsc | `npx tsc --noEmit 2>&1 \| head -20` | ✅ | ⬜ pending |
| 10-05-01 | 05 | 3 | RULES-09,10 | unit | `npm run rebuild:native:node && npx vitest run tests/unit/categories/rule-engine.test.ts -t "Phase 10: rule export" -t "Phase 10: rule import" 2>&1 \| tail -30` | ❌ W0 | ⬜ pending |
| 10-05-02 | 05 | 3 | RULES-09,10 | tsc | `npx tsc --noEmit 2>&1 \| head -20` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/categories/rule-engine.test.ts` — expand existing file: add describe blocks for `starts-with`, `ends-with`, `regex`, `AND conditions`, `drag reorder`, `export`, `import`, `migration`
- [ ] `tests/unit/categories/category-repository.test.ts` — expand existing file: add describe blocks for `rename propagation`, `merge preview`, `archive`
- [ ] `tests/unit/import/auto-apply.test.ts` — new file: covers RULES-11 (auto-apply at commit, uncategorized-only targeting, summary generation)

All Wave 0 stubs created in Plan 01 Task 3.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag-and-drop rule reorder visual feedback | RULES-04 | UI interaction requires Electron renderer | Drag a rule up/down in RulePane, verify order persists on reload |
| Import diff view side-by-side display | RULES-10 | Visual layout verification | Import a JSON with 1 matching rule, verify diff shows Keep/Replace/Skip buttons |
| Category merge preview modal display | RULES-06 | Modal interaction | Merge two categories, verify count preview shows before confirmation |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-30
