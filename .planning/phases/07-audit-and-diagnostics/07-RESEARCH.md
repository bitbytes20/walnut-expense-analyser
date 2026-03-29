# Phase 07 Research - Audit and Diagnostics

## Goal
Establish the technical architecture and established patterns for Phase 07: Audit and Diagnostics.

## Standard Stack
- **`electron-log`**: The industry standard for local Electron logging. Provides out-of-the-box file rotation, unhandled exception catching, and rolling logs suitable for D-04 (Crash Report Management).
- **`better-sqlite3`**: Already used in this app. The transaction capability is explicitly required to safely bind data mutations and their corresponding audit events in a single atomic commit.
- **Unified Event Contract**: A single `AuditEvent` TypeScript interface serving the UI, regardless of underlying table structures.

## Architecture Patterns
1. **Unified Audit Interface vs Schema**: Even though D-05 states extending existing logging (like `logSecurityEvent`), the standard pattern is a single unified `audit_events` SQLite table (or a fast UNION view) indexed by `createdAt`, `category`, and `entityId`. This simplifies the UI filtered chronological feed (D-01) and contextual fetch (D-02).
2. **Atomic Writes**: Any transaction edit MUST occur within a `db.transaction()` that includes both the row update and the `audit_events` insert. Dual-write bugs are the #1 cause of broken audit ledgers.
3. **Targeted Redaction Pipeline**: For D-03, implement a dedicated redaction boundary. Raw DB reads flow through a pure function (e.g., `redactForDiagnostics(row)`) before being written to an export JSON file. Amounts and categorical IDs pass through; strings (`description`, `notes`, `reference`) are explicitly overwritten with `[REDACTED]`.
4. **Crash Reporting**: `electron-log` can attach to `process.on('uncaughtException')` and `unhandledRejection` in the main process, saving traces directly to a `crashes.log` file without surfacing them to the UI on startup (satisfying D-04).

## Don't Hand-Roll
- **Log File Rotation**: Do not write custom `fs` scripts to prune log files. Use `electron-log`'s max-size and rotation features.
- **Redaction by Omission**: Never write an "allowlist" filter that just deletes keys. Explicitly overwrite sensitive string values so the shape of the data remains intact for debugging.
- **Custom Virtualization**: If the audit ledger needs to render 10k+ rows, use the same virtualization/pagination strategy already established in the Phase 4 Transaction Ledger. 
- **Exception Overrides**: Do not override React's global ErrorBoundary unless carefully passing the stack trace down to the main process via IPC for `electron-log`.

## Common Pitfalls
1. **Missing `entityId`**: If an event isn't tagged with the `entityId` (like a transaction ID), the contextual history (D-02) cannot easily query it without full JSON scanning.
2. **Metadata Bloat**: Storing entire transactions in the audit metadata instead of just the `diff` (before/after). It wastes space and slows down the ledger UI.
3. **Sync vs Async Logging**: `better-sqlite3` is synchronous. Ensure the `db.transaction()` does not perform async IPC calls in the middle holding the lock for UI edits.

## Code Examples

### Unified Audit Event (Types)
```typescript
interface AuditEvent {
  id: string; // UUID
  timestampISO: string;
  category: 'security' | 'review' | 'transaction' | 'settings';
  eventType: string; // e.g., 'transaction:edited'
  entityId?: string; // The UUID of the specific transaction/category
  details: Record<string, unknown>; // JSON payload for UI rendering
}
```

### Atomic Edit Pattern (Better-SQLite3)
```typescript
const updateTransactionAndAudit = db.transaction((txUpdate, auditPayload) => {
  // 1. Update the row
  updateStatement.run(txUpdate);
  // 2. Insert audit simultaneously
  insertAuditStatement.run({
    category: 'transaction',
    eventType: 'transaction:edited',
    entityId: txUpdate.id,
    metadata: JSON.stringify(auditPayload)
  });
});
// Safe from partial failures
updateTransactionAndAudit({ id: 'abc', ... }, { before: {...}, after: {...} });
```

### Diagnostics Redaction
```typescript
function redactDiagnosticTransaction(tx: Transaction): RedactedTransaction {
  return {
    ...tx,
    description: '[REDACTED]',
    reference: tx.reference ? '[REDACTED]' : null,
    tags: tx.tags.length > 0 ? ['[REDACTED]'] : []
    // Keep amounts, normalizedType, categoryId exactly as they are
  };
}
```
