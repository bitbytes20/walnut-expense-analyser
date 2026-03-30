import { useEffect, useState } from 'react'
import type { BulkResolveResult, ReviewItemResolutionAction } from '../../../shared/contracts/import'

interface ReviewBulkActionBarProps {
  selectedCount: number
  busy?: boolean
  bulkResult?: BulkResolveResult | null
  onAction: (action: ReviewItemResolutionAction, options?: { tag?: string }) => void
}

export const ReviewBulkActionBar = ({ selectedCount, busy = false, bulkResult, onAction }: ReviewBulkActionBarProps) => {
  const disabled = selectedCount === 0
  const [tag, setTag] = useState('')
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null)

  useEffect(() => {
    if (bulkResult && bulkResult.skippedCount > 0) {
      setConfirmMessage(`${bulkResult.approvedCount} approved, ${bulkResult.skippedCount} skipped (import gate still active)`)
      const timer = setTimeout(() => setConfirmMessage(null), 4000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [bulkResult])

  return (
    <section style={styles.root}>
      <div>
        <div style={styles.kicker}>Bulk actions</div>
        <h3 style={styles.heading}>{selectedCount} selected</h3>
      </div>
      {confirmMessage ? (
        <p style={styles.confirmMessage}>{confirmMessage}</p>
      ) : null}
      <div style={styles.actions}>
        <button type="button" style={styles.button} disabled={disabled || busy} onClick={() => onAction('accept-as-is')}>
          Accept selected as-is
        </button>
        <button type="button" style={styles.button} disabled={disabled || busy} onClick={() => onAction('discard')}>
          Discard selected
        </button>
        <button type="button" style={styles.button} disabled={disabled || busy} onClick={() => onAction('mark-duplicate')}>
          Mark selected as duplicate
        </button>
        <button type="button" style={styles.button} disabled={disabled || busy} onClick={() => onAction('mark-not-duplicate')}>
          Mark selected as not duplicate
        </button>
        <input
          type="text"
          value={tag}
          onChange={(event) => setTag(event.currentTarget.value)}
          placeholder="tag selected items"
          aria-label="Bulk tag value"
          style={styles.input}
        />
        <button
          type="button"
          style={styles.button}
          disabled={disabled || busy || tag.trim().length === 0}
          onClick={() => {
            onAction('apply-tag', { tag: tag.trim() })
            setTag('')
          }}
        >
          Apply tag to selected
        </button>
      </div>
    </section>
  )
}

const styles = {
  root: {
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
  confirmMessage: {
    margin: 0,
    fontSize: 14,
    color: 'var(--color-muted)'
  },
  actions: {
    display: 'flex',
    gap: 'var(--space-sm)',
    flexWrap: 'wrap' as const
  },
  input: {
    minHeight: 44,
    minWidth: 220,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(245, 241, 232, 0.92)',
    color: 'var(--color-ink)',
    padding: '0 18px'
  },
  button: {
    minHeight: 44,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-ink)',
    padding: '0 18px',
    fontWeight: 600
  }
} as const
