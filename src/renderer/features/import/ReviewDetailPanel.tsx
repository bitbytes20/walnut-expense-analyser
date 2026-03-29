import { useEffect, useState } from 'react'
import type { ReviewItem, ReviewItemEditInput, ReviewItemReasonCode, ReviewItemResolutionAction } from '../../../shared/contracts/import'

interface ReviewDetailPanelProps {
  item?: ReviewItem
  busy?: boolean
  onAction: (action: ReviewItemResolutionAction, options?: { edits?: ReviewItemEditInput; tag?: string }) => void
}

const amountFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
const formatAmount = (value?: number) =>
  typeof value === 'number' ? amountFormatter.format(value / 100) : 'Not available'

interface IssueGuide {
  what: string
  why: string
  actions: ReviewItemResolutionAction[]
  primaryAction: ReviewItemResolutionAction
  primaryLabel: string
}

const ISSUE_GUIDES: Record<ReviewItemReasonCode, IssueGuide> = {
  'balance-continuity-warning': {
    what: 'The running balance in this statement jumps unexpectedly around the date shown. This usually means a gap between statement periods — some transactions may be missing from your import history.',
    why: 'Walnut flags this so you know the ledger may not be complete for this period. It does not block the import — your transactions are still accepted.',
    actions: ['accept-as-is', 'discard'],
    primaryAction: 'accept-as-is',
    primaryLabel: 'Acknowledge and accept'
  },
  'duplicate-candidate': {
    what: 'This file appears to overlap with a prior import. Either the file fingerprint or the transaction signatures match records already in your ledger.',
    why: 'Importing it again would create duplicate transactions. If this is genuinely a new statement, mark it as not a duplicate to proceed.',
    actions: ['mark-not-duplicate', 'mark-duplicate', 'discard'],
    primaryAction: 'mark-not-duplicate',
    primaryLabel: 'Not a duplicate — import it'
  },
  'deferred-worksheet': {
    what: 'This file contains multiple worksheets and a specific one needs to be selected before import can proceed.',
    why: 'Walnut cannot guess which worksheet holds the transaction data. Go back to the import workspace, pick the correct sheet, then re-import.',
    actions: ['discard'],
    primaryAction: 'discard',
    primaryLabel: 'Discard and re-import with correct sheet'
  },
  'parser-uncertainty': {
    what: 'The parser could not confidently read one or more fields in this row — the date, amount, or description may be malformed or in an unexpected format.',
    why: 'Accepting with incorrect field values could corrupt your ledger. Review the fields below, correct them if needed, then accept.',
    actions: ['edit-before-accept', 'accept-as-is', 'discard'],
    primaryAction: 'edit-before-accept',
    primaryLabel: 'Edit fields and accept'
  },
  'unsupported-row-skipped': {
    what: 'This row used a format or transaction type that the ICICI parser does not currently support and was skipped during import.',
    why: 'The row is not in your ledger. You can accept as-is to acknowledge the skip, or discard to remove this review item.',
    actions: ['accept-as-is', 'discard'],
    primaryAction: 'accept-as-is',
    primaryLabel: 'Acknowledge skip'
  }
}

const ACTION_LABELS: Partial<Record<ReviewItemResolutionAction, string>> = {
  'accept-as-is': 'Accept as-is',
  'edit-before-accept': 'Edit and accept',
  'mark-duplicate': 'Confirm duplicate',
  'mark-not-duplicate': 'Not a duplicate — import it',
  'discard': 'Discard row',
  'apply-tag': 'Apply tag'
}

export const ReviewDetailPanel = ({ item, busy = false, onAction }: ReviewDetailPanelProps) => {
  const [transactionDateRaw, setTransactionDateRaw] = useState('')
  const [cleanedDescription, setCleanedDescription] = useState('')
  const [reference, setReference] = useState('')
  const [tags, setTags] = useState('')

  useEffect(() => {
    setTransactionDateRaw(item?.snapshot.parsedRow?.transactionDateRaw ?? '')
    setCleanedDescription(item?.snapshot.parsedRow?.cleanedDescription ?? '')
    setReference(item?.snapshot.parsedRow?.reference ?? '')
    setTags('')
  }, [item])

  if (!item) {
    return (
      <section style={styles.emptyState}>
        <div style={styles.kicker}>Detail panel</div>
        <h3 style={styles.heading}>Choose a review item</h3>
        <p style={styles.helper}>Select an item from the queue on the left to see what needs your attention and what actions are available.</p>
      </section>
    )
  }

  const guide = ISSUE_GUIDES[item.reasonCode]
  const row = item.snapshot.parsedRow
  const amount = row?.direction === 'credit' ? row.creditAmountMinor : row?.debitAmountMinor
  const showEditFields = item.reasonCode === 'parser-uncertainty'
  const edits: ReviewItemEditInput = {
    transactionDateRaw,
    cleanedDescription,
    reference,
    tags: tags.split(',').map((t) => t.trim()).filter(Boolean)
  }

  const secondaryActions = guide.actions.filter((a) => a !== guide.primaryAction)

  return (
    <section style={styles.root}>
      {/* Issue explanation */}
      <div>
        <div style={styles.kicker}>Active review item</div>
        <h3 style={styles.heading}>{item.title}</h3>
        <p style={styles.helper}>{item.description}</p>
      </div>

      <div style={item.severity === 'blocking' ? styles.guideCardBlocking : styles.guideCardWarning}>
        <div style={styles.guideRow}>
          <span style={styles.guideIcon}>{item.severity === 'blocking' ? '⛔' : '⚠️'}</span>
          <div>
            <p style={styles.guideWhat}>{guide.what}</p>
            <p style={styles.guideWhy}>{guide.why}</p>
          </div>
        </div>
      </div>

      {/* Transaction fields — always show for context, editable only for parser-uncertainty */}
      {row ? (
        <div>
          <p style={styles.fieldSectionLabel}>Transaction details</p>
          <div style={styles.fieldGrid}>
            <label style={styles.field}>
              <span>Date</span>
              <input
                type="text"
                value={transactionDateRaw}
                onChange={(e) => setTransactionDateRaw(e.currentTarget.value)}
                readOnly={!showEditFields}
                aria-label="Transaction date"
                style={showEditFields ? styles.input : styles.inputReadonly}
              />
            </label>
            <label style={styles.field}>
              <span>Description</span>
              <input
                type="text"
                value={cleanedDescription}
                onChange={(e) => setCleanedDescription(e.currentTarget.value)}
                readOnly={!showEditFields}
                aria-label="Transaction description"
                style={showEditFields ? styles.input : styles.inputReadonly}
              />
            </label>
            <label style={styles.field}>
              <span>Amount</span>
              <input type="text" value={formatAmount(amount)} readOnly aria-label="Amount" style={styles.inputReadonly} />
            </label>
            <label style={styles.field}>
              <span>Running balance</span>
              <input type="text" value={formatAmount(row.runningBalanceMinor)} readOnly aria-label="Running balance" style={styles.inputReadonly} />
            </label>
            {showEditFields && (
              <>
                <label style={styles.field}>
                  <span>Reference ID</span>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.currentTarget.value)}
                    aria-label="Reference ID"
                    style={styles.input}
                  />
                </label>
                <label style={styles.field}>
                  <span>Tags (comma separated)</span>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.currentTarget.value)}
                    aria-label="Tags"
                    style={styles.input}
                  />
                </label>
              </>
            )}
          </div>
          {!showEditFields && (
            <p style={styles.lockedNote}>Amount and running balance are protected to preserve statement trust.</p>
          )}
        </div>
      ) : null}

      {/* Source file */}
      {item.snapshot.sourceFileName ? (
        <p style={styles.sourceFile}>Source file: {item.snapshot.sourceFileName}</p>
      ) : null}

      {/* Actions */}
      <div style={styles.actionArea}>
        <button
          type="button"
          style={styles.primaryButton}
          disabled={busy}
          onClick={() =>
            onAction(guide.primaryAction, guide.primaryAction === 'edit-before-accept' ? { edits } : undefined)
          }
        >
          {guide.primaryLabel}
        </button>
        <div style={styles.secondaryActions}>
          {secondaryActions.map((action) => (
            <button
              key={action}
              type="button"
              style={styles.secondaryButton}
              disabled={busy || (action === 'apply-tag' && edits.tags?.length === 0)}
              onClick={() => onAction(action, action === 'edit-before-accept' ? { edits } : action === 'apply-tag' ? { tag: edits.tags?.[0] } : undefined)}
            >
              {ACTION_LABELS[action] ?? action}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

const fieldBase = {
  minHeight: 40,
  borderRadius: 10,
  border: '1px solid rgba(30, 27, 22, 0.12)',
  background: 'rgba(245, 241, 232, 0.88)',
  padding: '0 12px',
  color: 'var(--color-ink)',
  fontSize: 14
}

const styles = {
  root: {
    display: 'grid',
    gap: 'var(--space-lg)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.72)',
    boxShadow: 'var(--shadow-panel)'
  },
  emptyState: {
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.72)'
  },
  kicker: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--color-accent)'
  },
  heading: {
    margin: 'var(--space-xs) 0 0 0',
    fontSize: 18,
    lineHeight: 1.3,
    fontWeight: 600,
    color: 'var(--color-ink)'
  },
  helper: {
    margin: 'var(--space-xs) 0 0 0',
    color: 'var(--color-muted)',
    fontSize: 13,
    lineHeight: 1.5
  },
  guideCardBlocking: {
    borderRadius: 10,
    border: '1px solid rgba(180, 35, 24, 0.2)',
    background: 'rgba(180, 35, 24, 0.05)',
    padding: 'var(--space-md)'
  },
  guideCardWarning: {
    borderRadius: 10,
    border: '1px solid rgba(161, 113, 0, 0.25)',
    background: 'rgba(245, 190, 60, 0.08)',
    padding: 'var(--space-md)'
  },
  guideRow: {
    display: 'flex',
    gap: 'var(--space-sm)',
    alignItems: 'flex-start'
  },
  guideIcon: {
    fontSize: 16,
    flexShrink: 0,
    marginTop: 2
  },
  guideWhat: {
    margin: '0 0 6px 0',
    fontSize: 13,
    lineHeight: 1.55,
    color: 'var(--color-ink)',
    fontWeight: 500
  },
  guideWhy: {
    margin: 0,
    fontSize: 12,
    lineHeight: 1.5,
    color: 'var(--color-muted)'
  },
  fieldSectionLabel: {
    margin: '0 0 var(--space-sm) 0',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--color-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em'
  },
  fieldGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 'var(--space-sm)'
  },
  field: {
    display: 'grid',
    gap: 4,
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--color-ink)'
  },
  input: fieldBase,
  inputReadonly: {
    ...fieldBase,
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-muted)',
    border: '1px solid transparent'
  },
  lockedNote: {
    margin: 'var(--space-xs) 0 0 0',
    fontSize: 12,
    color: 'var(--color-muted)'
  },
  sourceFile: {
    margin: 0,
    fontSize: 12,
    color: 'var(--color-muted)',
    fontFamily: 'monospace'
  },
  actionArea: {
    display: 'grid',
    gap: 'var(--space-sm)'
  },
  primaryButton: {
    minHeight: 44,
    border: 0,
    borderRadius: 999,
    background: 'var(--color-accent)',
    color: '#fff',
    padding: '0 20px',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    textAlign: 'left' as const
  },
  secondaryActions: {
    display: 'flex',
    gap: 'var(--space-sm)',
    flexWrap: 'wrap' as const
  },
  secondaryButton: {
    minHeight: 38,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-ink)',
    padding: '0 16px',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer'
  }
} as const
