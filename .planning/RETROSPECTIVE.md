# Retrospective: Walnut Expense Analyser

---

## Milestone: v1.0 — Release 1: Foundation

**Shipped:** 2026-03-29
**Phases:** 8 | **Plans:** 30 | **Timeline:** 3 days (2026-03-27 → 2026-03-29)

### What Was Built

1. Electron desktop shell with guided onboarding, 6-digit PIN, recovery key, idle auto-lock
2. Strict ICICI CSV/XLS/XLSX import pipeline with parser confidence scoring and duplicate blocking
3. Review queue, mixed import gating, import history with batch detail receipts
4. Transaction ledger — normalization, full-field editing, freeform tags, advanced search/filter
5. Protected category taxonomy with starter rules, user-rule precedence, preview-first bulk apply
6. Premium dashboard — spend-by-category, trends, recurring detection, merchant insights, date-range controls
7. Full audit event ledger, redacted diagnostics bundle, local crash report storage
8. Owner settings — encrypted backup/restore (scrypt + AES-256-GCM), change-PIN, configurable idle timeout, theme toggle, Ctrl+1-8 keyboard shortcuts, full reset

### What Worked

- **Wave-based parallel execution** — Wave 1 pairs (backend + services) ran simultaneously, cutting execution time significantly
- **Checkpoint pattern for UI plans** — human-verify checkpoint on Plan 08-04 caught real UX before committing to SUMMARY
- **TDD on crypto/security code** — backup-service and pin-service tests caught edge cases (wrong PIN, version header) before integration
- **Detailed plan interfaces sections** — embedding existing type signatures directly in plans eliminated guesswork for executors
- **Worktree isolation** — parallel agents working in isolated branches prevented git conflicts during execution

### What Was Inefficient

- **Requirements tracking drift** — REQUIREMENTS.md checkboxes and traceability table fell behind phases 2, 4, 6, 7. Required manual reconciliation at milestone close
- **Worktree merge complexity** — parallel agent worktrees sometimes needed manual merging at wave boundaries; occasional conflict resolution overhead
- **STATE.md content staleness** — some body text (active branch, current focus) didn't update automatically across waves, requiring manual cleanup at milestone close

### Patterns Established

- `exportBackupPayload` explicitly excludes PIN/recovery hashes — security-sensitive fields are always named in the exclusion list, not assumed absent
- Idle lock timeout reads from `AppConfig.idleLockTimeoutMs` (0 = never) — all configurable timers follow this pattern
- `data-theme` attribute + `prefers-color-scheme` media query with `:not([data-theme="light"])` guard — the theme CSS pattern for all future theme work
- Type-to-confirm modal for destructive operations ("RESET" to unlock) — the pattern for all irreversible data operations

### Key Lessons

- Keep requirements traceability table updated after each phase, not at milestone close — reconciliation at the end is avoidable friction
- Checkpoint plans (autonomous: false) work well for UI verification — the brief human pause catches real issues before they compound
- Pre-existing TypeScript errors from earlier phases create noise during phase 8 verification — worth a periodic "fix all TS errors" cleanup phase
- scrypt key derivation is noticeably slow in tests (~150ms per round) — use a low N value (N: 1024) in test fixtures to keep unit test suites fast

### Cost Observations

- Model: claude-sonnet-4-6 throughout
- Sessions: 1 continuous session for phases 7-8
- Notable: parallel wave execution on sonnet was cost-effective; checkpoint on 08-04 required only a brief continuation agent

---

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases | 8 |
| Plans | 30 |
| Timeline | 3 days |
| Source files | 78 |
| TypeScript LOC | ~19,100 |
| Test coverage | Unit tests per phase; 39 tests for phase 8 alone |
| Requirements hit rate | 34/34 (100%) |
