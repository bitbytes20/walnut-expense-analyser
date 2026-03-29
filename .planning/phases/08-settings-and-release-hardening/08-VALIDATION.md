---
phase: 8
slug: settings-and-release-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 with jsdom + React Testing Library |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npm run test:unit -- --reporter=dot` |
| **Full suite command** | `npm run test:unit` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit -- --reporter=dot`
- **After every plan wave:** Run `npm run test:unit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 8-01-01 | 01 | 1 | SETG-01 | unit | `vitest run tests/unit/backup-service.test.ts` | ❌ W0 | ⬜ pending |
| 8-01-02 | 01 | 1 | SETG-01 | unit | `vitest run tests/unit/backup-service.test.ts` | ❌ W0 | ⬜ pending |
| 8-01-03 | 01 | 1 | SETG-01 | unit | `vitest run tests/unit/app-config.test.ts` | ❌ W0 | ⬜ pending |
| 8-02-01 | 02 | 1 | SECU-03 | unit | `vitest run tests/unit/pin-service.test.ts` | ✅ extend | ⬜ pending |
| 8-02-02 | 02 | 1 | SECU-03 | unit | `vitest run tests/unit/pin-service.test.ts` | ✅ extend | ⬜ pending |
| 8-03-01 | 03 | 2 | SETG-01 | unit | `vitest run tests/unit/cleanup.test.ts` | ❌ W0 | ⬜ pending |
| 8-04-01 | 04 | 2 | ACCS-01 | unit | `vitest run tests/unit/keyboard-shortcuts.test.ts` | ❌ W0 | ⬜ pending |
| 8-04-02 | 04 | 2 | ACCS-01 | unit | `vitest run tests/unit/keyboard-shortcuts.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/backup-service.test.ts` — stubs for SETG-01 backup encryption round-trip
- [ ] `tests/unit/app-config.test.ts` — stubs for SETG-01 config persistence
- [ ] `tests/unit/cleanup.test.ts` — stubs for SETG-01 clearTransactions
- [ ] `tests/unit/keyboard-shortcuts.test.ts` — stubs for ACCS-01 keyboard navigation
- [ ] Extend `tests/unit/pin-service.test.ts` — additional cases for SECU-03 change-PIN flow

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Theme toggle persists across reload | SETG-01 | Requires Electron window reload + visual confirmation | Toggle theme in Settings, reload app, verify CSS data-attribute matches selection |
| Backup file opens correctly on restore | SETG-01 | Requires native file dialog interaction | Create backup, use "Restore from Backup", select the file, verify data intact |
| Idle lock fires at configured interval | SETG-01 | Requires real-time wait | Set timeout to 1 min, wait, verify lock screen appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
