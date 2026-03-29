---
status: partial
phase: 08-settings-and-release-hardening
source: [08-VERIFICATION.md]
started: 2026-03-29T13:45:00.000Z
updated: 2026-03-29T13:45:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Settings screen visual order
expected: Six sections render in documented order — Preferences, Security, Backup, Support, Lab, Danger Zone. Danger Zone has a red border/tint. Navigate via Ctrl+7.
result: [pending]

### 2. Theme toggle persistence
expected: Select Dark theme → color changes immediately. Close and reopen app → theme selection survives restart.
result: [pending]

### 3. Change PIN wrong-PIN error
expected: Open Change PIN form, enter incorrect current PIN. Inline error "Current PIN is incorrect." appears without closing the form.
result: [pending]

### 4. Create Backup native dialog
expected: Enter PIN, click Create Backup. OS native save dialog opens with a .wbk default filename. File lands on disk at the chosen path.
result: [pending]

### 5. Full App Reset type-to-confirm
expected: Type "RESE" — confirm button stays disabled. Complete "RESET" — button enables. Confirm → app routes to onboarding welcome screen.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
