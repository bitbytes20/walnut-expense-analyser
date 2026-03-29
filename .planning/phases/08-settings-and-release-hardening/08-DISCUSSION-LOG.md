# Phase 8: Settings and Release Hardening — Discussion Log

**Session date:** 2026-03-29
**Areas discussed:** Settings structure, Backup and restore scope, Keyboard shortcut coverage, Feature flags and reset tools

---

## Settings Screen Structure

**Q: How should the expanded settings screen be organised?**
Options: Single page/sections | Tabbed layout | Sidebar categories
**Selected:** Single page, sections

**Q: What section order and grouping?**
Options: Preferences→Security→Backup→Support→Danger Zone | Preferences→Backup→Security→Support→Danger Zone | You decide
**Selected:** Preferences → Security → Backup → Support → Danger Zone

**Q: Where should feature flags live?**
Options: Inside Danger Zone | Own section — Feature Flags / Lab | Hidden inside Support
**Selected:** Own section — Feature Flags / Lab (between Support and Danger Zone)

---

## Backup and Restore Scope

**Q: What should a backup include?**
Options: Full data backup (everything except PIN/recovery key hashes) | Data only, no config | You decide
**Selected:** Full data backup — everything except PIN and recovery key hashes

**Q: How should the backup file be encrypted?**
Options: PIN-derived encryption (AES-256) | Separate backup passphrase | Unencrypted but warned
**Selected:** PIN-derived encryption (AES-256)

**Q: How does restore work?**
Options: Restore data, then prompt to set a new PIN | Restore data only, keep existing PIN | You decide
**Selected:** Restore data, then prompt to set a new PIN (recovery key also regenerated)

---

## Keyboard Shortcut Coverage

**Q: What scope of keyboard coverage is the goal?**
Options: Global navigation shortcuts + critical actions | Full workflow coverage | Tab/focus navigation only
**Selected:** Global navigation shortcuts + critical actions

**Q: Should shortcuts be discoverable in the UI?**
Options: Tooltip hints on nav buttons | Keyboard shortcuts panel in Settings | No discoverability
**Selected:** Tooltip hints on nav buttons

**Q: How should global navigation shortcuts be bound?**
Options: Ctrl+1 through Ctrl+8 | Ctrl+letter mnemonics | You decide
**Selected:** Ctrl+1 through Ctrl+8

---

## Feature Flags and Reset Tools

**Q: What feature flags should exist at release?**
Options: AI summaries toggle only | AI summaries + diagnostics verbosity | You decide
**Selected:** AI summaries toggle only

**Q: What should "granular cleanup" mean?**
Options: Clear transactions only, or clear all data | Per-batch or per-account delete | You decide
**Selected:** Two options: clear transactions only (keep categories/rules/config) OR full app reset

**Q: Should Danger Zone actions require confirmation beyond a single click?**
Options: Type-to-confirm for full reset, single confirm for partial | Confirmation dialog for all | You decide
**Selected:** Type-to-confirm for full reset, single confirmation dialog for partial (clear transactions)
