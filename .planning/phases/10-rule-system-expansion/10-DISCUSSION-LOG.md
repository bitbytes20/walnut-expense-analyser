# Phase 10: Rule System Expansion - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 10-rule-system-expansion
**Areas discussed:** Multi-condition AND model, Rule priority (drag vs specificity), Auto-apply at import visibility, Rule export/import conflict handling

---

## Multi-condition AND model

### Q1: How should string conditions with different operators be modelled?

| Option | Description | Selected |
|--------|-------------|----------|
| Structured array with operator per entry | `descriptionTerms: [{op, value}]` — all entries AND. Operator dropdown per row in editor. | ✓ |
| Separate fields per operator type | Keep `descriptionContains[]`, add `descriptionStartsWith[]`, `descriptionEndsWith[]` | |
| Single field, operator prefix syntax | Encode operator in string value (`'starts:PAY'`) | |

**User's choice:** Structured array with operator per entry
**Notes:** Preview selected — liked the explicit row-per-condition UI pattern.

---

### Q2: Should amount range fields be absorbed into the same conditions array?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep amount range as separate min/max fields | `amountMinMinor` / `amountMaxMinor` stay as is alongside `descriptionTerms[]` | ✓ |
| Unify everything into one conditions array | Single `conditions[]` with field+operator+value for all types | |

**User's choice:** Keep amount range as separate min/max fields
**Notes:** Less migration risk; amount fields already work correctly.

---

### Q3: How does the user enable regex mode?

| Option | Description | Selected |
|--------|-------------|----------|
| Operator dropdown includes 'regex' as an option | Consistent with structured array — `op: 'regex'` in same dropdown | ✓ |
| Separate advanced toggle per rule | Rule-level toggle switches entire description matching to regex | |

**User's choice:** Operator dropdown includes 'regex' as an option

---

## Rule priority: drag vs specificity

### Q1: When drag order and specificity point to different rules, which wins?

| Option | Description | Selected |
|--------|-------------|----------|
| Manual drag order replaces specificity | First match in drag order wins; specificity score is informational only | ✓ |
| Specificity still wins; drag is cosmetic | Engine still picks most specific rule; drag is visual only | |
| Drag sets soft priority; specificity breaks ties | Drag sets band; specificity breaks ties within band | |

**User's choice:** Manual drag order replaces specificity
**Notes:** User wants full control; specificity retained as informational badge only.

---

### Q2: Can users drag system rules to any position?

| Option | Description | Selected |
|--------|-------------|----------|
| System rules always evaluate after all user rules | User rules tried first in drag order; system rules are fallback | ✓ |
| Users can drag system rules anywhere | Full positional freedom | |

**User's choice:** System rules always evaluate after all user rules
**Notes:** Preserves Phase 5 "user rules always override heuristics" invariant.

---

## Auto-apply at import: visibility

### Q1: What does the user see when rules fire automatically at import commit?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline summary on import success screen | "N transactions auto-categorized by your rules" with expandable rule breakdown | ✓ |
| Silent — rules fire in background | No user-visible feedback; audit log records events | |
| Toast notification after commit | Dismissible toast showing count | |

**User's choice:** Inline summary on import success screen
**Notes:** Expandable detail defaults to collapsed so the CTA remains visible.

---

### Q2: Should auto-categorization emit audit events?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — emit audit events for rule-driven categorization | Each auto-categorization creates an audit event with rule name + before/after | ✓ |
| No — bulk rule application is too noisy for audit log | Only manual edits appear in audit | |

**User's choice:** Yes — emit audit events
**Notes:** Consistent with TRAN-03 (manual edits emit audit events).

---

## Rule export/import: conflict handling

### Q1: How to handle category ID mismatches when importing rules?

| Option | Description | Selected |
|--------|-------------|----------|
| Match categories by name, remap silently | Look up by name; if not found, import rule without category + show warning | ✓ |
| Block import if any category ID is unresolvable | Strict: user must create missing categories first | |
| User remaps categories manually during import | Pre-import mapping screen with dropdowns | |

**User's choice:** Match categories by name, remap silently
**Notes:** Warning shown per rule: "Category '[name]' not found — rule imported without category assignment."

---

### Q2: What counts as a 'conflict' for the side-by-side diff?

| Option | Description | Selected |
|--------|-------------|----------|
| Same rule name = conflict | Name is the human identifier; simple to detect | ✓ |
| Same conditions = conflict | Structural condition comparison | |
| Any overlap = conflict | Run both rules against transaction set; most accurate but expensive | |

**User's choice:** Same rule name = conflict
**Notes:** User can choose to keep existing, replace with incoming, or skip.

---

## Claude's Discretion

- Exact visual treatment of the specificity badge
- Drag-reorder implementation details (handle position, animation)
- Wording of auto-categorization summary expansion
- ReDoS detection heuristic approach
- Empty-state copy for the rule import diff screen when there are no conflicts

## Deferred Ideas

- OR / nested boolean rule logic (out of scope per REQUIREMENTS.md)
- Rule change history and revert (RULES-F02 — future)
- AI/ML rule suggestions (RULES-F03 — future)
