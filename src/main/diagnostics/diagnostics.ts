import { app } from 'electron'
import type { TransactionLedgerRow } from '../../shared/contracts/transactions'
import type { DiagnosticsBundle, RedactedTransaction } from '../../shared/contracts/diagnostics'
import { getWalnutRepository } from '../persistence/db'

/**
 * Redacts all sensitive string fields from a transaction row, preserving numeric
 * amounts and category IDs so support bundles remain analytically useful.
 */
export function redactDiagnosticTransaction(tx: TransactionLedgerRow): RedactedTransaction {
  return {
    id: tx.id,
    importBatchId: tx.importBatchId,
    transactionDateSortable: tx.transactionDateSortable,
    signedAmountMinor: tx.signedAmountMinor,
    normalizedType: tx.normalizedType,
    categoryId: tx.categoryId,
    description: '[REDACTED]',
    reference: tx.reference != null ? '[REDACTED]' : null,
    tags: tx.tags.length > 0 ? ['[REDACTED]'] : []
  }
}

/**
 * Generates a full or redacted diagnostics bundle as a JSON string.
 *
 * - `full`: includes all transaction fields and audit events unmodified (local use only).
 * - `redacted`: strips sensitive description, reference, and tag text so the bundle
 *   is safe to share with support.
 *
 * Both bundles include system metrics and the security/audit event ledger.
 */
export function generateDiagnosticsBundle(type: 'full' | 'redacted'): string {
  const repository = getWalnutRepository()
  const transactions = repository.listTransactions()
  const auditEvents = repository.getSecurityEvents()

  const processedTransactions =
    type === 'redacted'
      ? transactions.map((tx) => redactDiagnosticTransaction(tx))
      : transactions

  const bundle: DiagnosticsBundle = {
    type,
    generatedAt: new Date().toISOString(),
    systemInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      appVersion: app.getVersion()
    },
    transactions: processedTransactions,
    auditEvents
  }

  return JSON.stringify(bundle, null, 2)
}
