# Phase 07 Context - Audit and Diagnostics

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Providing full traceability of user/system actions (event ledger) and safe supportability tools (diagnostics, crash reports) without leaking sensitive user data off-device.

</domain>

<decisions>
## Implementation Decisions

### Audit Ledger Layout
- **D-01:** Implement a single chronologically sorted feed of events with category filtering toggles (e.g., Security, Review, Edits) to allow users to tune down noise without losing chronological context.

### Transaction Edit Visibility
- **D-02:** Support dual visibility: edits must appear in the global audit ledger, but specific transaction histories must also be accessible inline within the Transaction Drawer for contextual analysis.

### Diagnostics Redaction Strategy
- **D-03:** Redact via selective masking: keep exact amounts and generic categorical abstractions, but automatically mask specific transaction descriptions and explicitly identifying details before safe external sharing.

### Crash Report Management
- **D-04:** Keep a silent rolling log of recent crashes accessible via the Owner Settings > Support panel. Do not surface startup crash notifications to avoid alarm fatigue; they are present simply internally for debugging and support when needed.

### Existing Code Leverage
- **D-05:** Hook into the existing event logging (`insertReviewAuditEvent`, `logSecurityEvent`) established in `db.ts` to populate the new unified audit ledger.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Definitions
- `.planning/REQUIREMENTS.md` — Section: Audit, Support, and System (AUDT-01, SUPP-01, SUPP-02, CRSH-01)
</canonical_refs>
