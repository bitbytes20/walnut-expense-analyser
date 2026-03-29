---
phase: 7
slug: audit-and-diagnostics
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-29
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | CRSH-01 | run | `grep -r "electron-log" package.json` | ✅ | ⬜ pending |
| 07-01-02 | 01 | 1 | D-05 | unit | `npm run test` | ✅ | ⬜ pending |
| 07-02-01 | 02 | 2 | TRAN-03 | unit | `npm run test` | ✅ | ⬜ pending |
| 07-03-01 | 03 | 2 | SUPP-01 | unit | `npm run test` | ✅ | ⬜ pending |
| 07-04-01 | 04 | 3 | AUDT-01 | compile | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/diagnostics.test.ts` — stubs for SUPP-01 redaction logic

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Export Dialog | D-04 | Native OS UI | Click "Export Redacted Diagnostics", ensure save dialog opens and saves JSON. |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-29
