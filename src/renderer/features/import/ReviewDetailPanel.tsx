import { useEffect, useState } from 'react'
import type { ReviewItem, ReviewItemEditInput, ReviewItemResolutionAction } from '../../../shared/contracts/import'

interface ReviewDetailPanelProps {
  item?: ReviewItem
  busy?: boolean
  onAction: (action: ReviewItemResolutionAction, options?: { edits?: ReviewItemEditInput; tag?: string }) => void
}

const amountFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR'
})

const formatAmount = (value?: number) => {
  if (typeof value !== 'number') {
    return 'Not available'
  }

  return amountFormatter.format(value / 100)
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
        <p style={styles.helper}>Open a queue item to inspect its protected fields and approved actions.</p>
      </section>
    )
  }

  const row = item.snapshot.parsedRow
  const amount = row?.direction === 'credit' ? row.creditAmountMinor : row?.debitAmountMinor
  const edits: ReviewItemEditInput = {
    transactionDateRaw,
    cleanedDescription,
    reference,
    tags: tags
      .split(',')
      .map((candidate) => candidate.trim())
      .filter(Boolean)
  }

  return (
    <section style={styles.root}>
      <div>
        <div style={styles.kicker}>Active review detail</div>
        <h3 style={styles.heading}>{item.title}</h3>
        <p style={styles.helper}>{item.description}</p>
      </div>

      <div style={styles.fieldGrid}>
        <label style={styles.field}>
          <span>Date</span>
          <input
            type="text"
            value={transactionDateRaw}
            onChange={(event) => setTransactionDateRaw(event.currentTarget.value)}
            aria-label="Editable review date"
            style={styles.input}
          />
        </label>
        <label style={styles.field}>
          <span>Description</span>
          <input
            type="text"
            value={cleanedDescription}
            onChange={(event) => setCleanedDescription(event.currentTarget.value)}
            aria-label="Editable review description"
            style={styles.input}
          />
        </label>
        <label style={styles.field}>
          <span>Reference ID</span>
          <input
            type="text"
            value={reference}
            onChange={(event) => setReference(event.currentTarget.value)}
            aria-label="Editable review reference ID"
            style={styles.input}
          />
        </label>
        <label style={styles.field}>
          <span>Tags</span>
          <input
            type="text"
            value={tags}
            onChange={(event) => setTags(event.currentTarget.value)}
            aria-label="Editable review tags"
            style={styles.input}
          />
        </label>
      </div>

      <div style={styles.fieldGrid}>
        <label style={styles.field}>
          <span>Amount</span>
          <input type="text" value={formatAmount(amount)} readOnly aria-label="Protected amount" style={styles.input} />
        </label>
        <label style={styles.field}>
          <span>Running balance</span>
          <input
            type="text"
            value={formatAmount(row?.runningBalanceMinor)}
            readOnly
            aria-label="Protected running balance"
            style={styles.input}
          />
        </label>
      </div>

      <p style={styles.helper}>Amount and running balance stay locked here to protect statement trust.</p>

      <div style={styles.actions}>
        <button type="button" style={styles.primaryButton} disabled={busy} onClick={() => onAction('accept-as-is')}>
          Accept as-is
        </button>
        <button type="button" style={styles.secondaryButton} disabled={busy} onClick={() => onAction('edit-before-accept', { edits })}>
          Edit before accepting
        </button>
        <button type="button" style={styles.secondaryButton} disabled={busy} onClick={() => onAction('mark-duplicate')}>
          Mark as duplicate
        </button>
        <button type="button" style={styles.secondaryButton} disabled={busy} onClick={() => onAction('mark-not-duplicate')}>
          Mark as not duplicate
        </button>
        <button type="button" style={styles.secondaryButton} disabled={busy} onClick={() => onAction('discard')}>
          Discard row
        </button>
        <button
          type="button"
          style={styles.secondaryButton}
          disabled={busy || edits.tags?.length === 0}
          onClick={() => onAction('apply-tag', { tag: edits.tags?.[0] })}
        >
          Apply tag
        </button>
      </div>
    </section>
  )
}

const fieldBase = {
  minHeight: 44,
  borderRadius: 12,
  border: '1px solid rgba(30, 27, 22, 0.12)',
  background: 'rgba(245, 241, 232, 0.88)',
  padding: '0 14px',
  color: 'var(--color-ink)'
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
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-accent)'
  },
  heading: {
    margin: 'var(--space-sm) 0 0 0',
    fontSize: 'var(--font-heading-size)',
    lineHeight: 1.2
  },
  helper: {
    margin: 0,
    color: 'var(--color-muted)'
  },
  fieldGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 'var(--space-md)'
  },
  field: {
    display: 'grid',
    gap: 'var(--space-sm)',
    color: 'var(--color-ink)',
    fontWeight: 600
  },
  input: fieldBase,
  actions: {
    display: 'flex',
    gap: 'var(--space-sm)',
    flexWrap: 'wrap'
  },
  primaryButton: {
    minHeight: 44,
    border: 0,
    borderRadius: 999,
    background: 'var(--color-accent)',
    color: '#fff',
    padding: '0 18px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-ink)',
    padding: '0 18px',
    fontWeight: 600,
    cursor: 'pointer'
  }
} as const
