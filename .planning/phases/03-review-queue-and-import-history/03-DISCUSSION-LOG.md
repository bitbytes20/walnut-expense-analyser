# Phase 3: Review Queue and Import History - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 03-review-queue-and-import-history
**Areas discussed:** Review Queue Model, Import History Behavior, Review-to-Import Relationship, Resolution Workflow and Safety

---

## Review Queue Model

| Option | Description | Selected |
|--------|-------------|----------|
| Duplicate-candidate transactions | Items needing duplicate confirmation | Yes |
| Parser uncertainty rows | Rows the parser could not trust fully | Yes |
| Deferred worksheet decisions | Multi-sheet Excel decisions postponed from import | Yes |
| Balance continuity warnings | Rows or files with suspicious balance discontinuities | Yes |
| Unsupported rows skipped from accepted import | Problem rows from otherwise accepted files | Yes |
| Group by import batch | Organize queue by source batch first | Yes |
| Group by issue type | Organize by duplicate/warning/error type | |
| Flat queue with filters | One combined list plus filters | |
| Mark duplicate / not duplicate | Explicit duplicate resolution actions | Yes |
| Accept as-is | Accept parsed row with no edits | Yes |
| Edit before accept | Correct fields before accepting | Yes |
| Discard row | Remove a review item from accepted data | Yes |
| Apply follow-up tag | Tag item for later tracking | Yes |
| Unresolved items only | Keep the queue focused on open work | Yes |
| Resolved history with filters | Show past resolved items in the same queue | |

**User's choice:** Include all current unresolved item types, group the queue by import batch, allow all recommended resolution actions, and show unresolved items only.
**Notes:** The user clearly wants the queue to function as an owner-facing worklist rather than a mixed archive.

---

## Import History Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Recommended row summary | Show import date/time, account, file count, accepted transactions, blocked duplicates, unresolved review count, and status badge | Yes |
| Successful imports only | Store only batches that ended in accepted records | |
| All import attempts | Include successful, failed, and rejected imports | Yes |
| Summary only | Batch detail stops at high-level metadata | |
| Summary plus per-file outcomes | Show high-level batch detail and each file result | |
| Summary plus per-file outcomes plus transaction drill-down | Full batch detail with row-level visibility | Yes |
| Reopen batch into review | Jump from history back into unresolved work | Yes |

**User's choice:** Use the recommended row summary, include all import attempts, provide summary plus per-file outcomes plus transaction-level drill-down, and allow past batches to reopen into review.
**Notes:** Reopening a batch into review was recommended because it keeps history actionable instead of archival-only.

---

## Review-to-Import Relationship

| Option | Description | Selected |
|--------|-------------|----------|
| Batch stays `Needs review` until clear | Keep pending status while unresolved items remain | Yes |
| Imported with pending review | Treat the batch as mostly complete with a softer badge | |
| Hide accepted transactions until resolution completes | Hold accepted records back from future surfaces | |
| Make accepted transactions available immediately | Allow trusted accepted records to flow onward even while review remains open | Yes |
| Require one-session completion | Encourage finishing all review work in one pass | |
| Allow partial passes across sessions | Let owners return later and continue resolving | Yes |
| Freeze original summary counts | Keep history counts fixed and separate later resolutions | |
| Update summary counts live | Keep the batch summary current as review work changes | Yes |

**User's choice:** Batches with unresolved items should stay in `Needs review`, accepted transactions should remain available, review can happen in partial passes across sessions, and summary counts should update live.
**Notes:** This creates a dual-state trust model: accepted records remain usable while the batch still visibly signals incomplete review work.

---

## Resolution Workflow and Safety

**Questions asked**
- Which review-item fields should be editable before acceptance?
- Which bulk actions should exist in Phase 3?
- Should every resolution action create an audit event?
- Should mistaken discard or duplicate actions be recoverable?

**User's choice**
- Follow the recommended editable-field and bulk-action set.
- Record an audit event for every resolution action.
- Support undo or soft-restore for mistaken discard or duplicate decisions.

**Recommended defaults accepted**
- Editable fields: date, description, reference ID, and tags
- Protected fields in Phase 3: debit/credit amount and running balance
- Bulk actions: accept selected as-is, discard selected, mark selected as duplicate, mark selected as not duplicate, and apply tag to selected

**Notes**
- The recommendation intentionally keeps the highest-risk financial fields protected during early review workflows to preserve statement trust.

---

## the agent's Discretion

- Exact visual structure of the batch-grouped review queue
- Exact badge wording and color treatment for history/review states
- Exact undo mechanics and retention window for soft-restore
- Exact copy for warning-style review items

## Deferred Ideas

- Resolved-item archive views in the review queue
- Broader transaction editing outside the review workflow
- Dashboard surfaces for import-health metrics
