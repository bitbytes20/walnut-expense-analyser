import { useEffect, useState } from 'react'
import type { CategoryTreeNode } from '../../../shared/contracts/categories'
import type { AuditEvent } from '../../../shared/contracts/audit'
import type { TransactionDetail, TransactionNormalizedType, TransactionReviewState, TransactionRuleSuggestion, UpdateTransactionInput } from '../../../shared/contracts/transactions'

interface TransactionDetailDrawerProps {
  detail?: TransactionDetail
  saving: boolean
  ruleSuggestion?: TransactionRuleSuggestion
  onClose: () => void
  onSave: (input: UpdateTransactionInput) => void
  onUseRuleSuggestion?: (suggestion: TransactionRuleSuggestion) => void
}

const typeOptions: Array<{ value: TransactionNormalizedType; label: string }> = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'refund', label: 'Refund' },
  { value: 'atm-withdrawal', label: 'ATM withdrawal' },
  { value: 'credit-card-payment', label: 'Credit card payment' }
]

const reviewStateOptions: Array<{ value: TransactionReviewState | ''; label: string }> = [
  { value: '', label: 'Inherited' },
  { value: 'clean', label: 'Clean' },
  { value: 'pending-review', label: 'Pending review' }
]

const formatAmountInput = (minor: number) => String(minor / 100)
const formatCurrency = (minor?: number) =>
  minor === undefined ? 'Unavailable' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(minor / 100)

const flattenCategories = (nodes: CategoryTreeNode[]): Array<{ id: string; label: string }> =>
  nodes.flatMap((node) => [
    { id: node.id, label: node.path.join(' > ') },
    ...flattenCategories(node.children as CategoryTreeNode[])
  ])

export const TransactionDetailDrawer = ({ detail, saving, ruleSuggestion, onClose, onSave, onUseRuleSuggestion }: TransactionDetailDrawerProps) => {
  const [transactionDateRaw, setTransactionDateRaw] = useState('')
  const [description, setDescription] = useState('')
  const [signedAmount, setSignedAmount] = useState('')
  const [normalizedType, setNormalizedType] = useState<TransactionNormalizedType>('expense')
  const [categoryId, setCategoryId] = useState('')
  const [reference, setReference] = useState('')
  const [tags, setTags] = useState('')
  const [reviewStateOverride, setReviewStateOverride] = useState<TransactionReviewState | ''>('')
  const [categoryOptions, setCategoryOptions] = useState<Array<{ id: string; label: string }>>([])
  const [tab, setTab] = useState<'edit' | 'history'>('edit')
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])

  useEffect(() => {
    let cancelled = false
    void window.walnut.listCategories().then((categories) => {
      if (!cancelled) {
        setCategoryOptions(flattenCategories(categories))
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!detail) {
      return
    }

    setTransactionDateRaw(detail.transactionDateRaw)
    setDescription(detail.description)
    setSignedAmount(formatAmountInput(detail.signedAmountMinor))
    setNormalizedType(detail.normalizedType)
    setCategoryId(detail.categoryId ?? '')
    setReference(detail.reference ?? '')
    setTags(detail.tags.join(', '))
    setReviewStateOverride(detail.reviewStateOverride ?? '')

    let cancelledEvents = false
    void window.walnut.getAuditEvents({ entityId: detail.id }).then((events) => {
      if (!cancelledEvents) {
        setAuditEvents(events)
      }
    })

    return () => {
      cancelledEvents = true
    }
  }, [detail])

  if (!detail) {
    return (
      <section style={styles.emptyDrawer}>
        <div style={styles.kicker}>Transaction drawer</div>
        <h3 style={styles.heading}>Select a transaction</h3>
        <p style={styles.helper}>Use the pencil action in the ledger to open a transaction here for corrections.</p>
      </section>
    )
  }

  return (
    <aside style={styles.drawer}>
      <div style={styles.topBar}>
        <div style={styles.kicker}>Transaction drawer</div>
        <button type="button" style={styles.closeButton} onClick={onClose}>
          Close
        </button>
      </div>

      <div style={styles.snapshot}>
        <h3 style={styles.heading}>{detail.description}</h3>
        <p style={styles.helper}>
          {detail.batchLabel} · {detail.sourceFileName}
        </p>
        <div style={styles.metaGrid}>
          <span>Imported: {new Date(detail.importedAt).toLocaleString()}</span>
          <span>Review state: {detail.reviewState}</span>
          <span>Reference: {detail.reference ?? 'No reference'}</span>
          <span>Running balance: {formatCurrency(detail.runningBalanceMinor)}</span>
        </div>
      </div>

      <div style={styles.tabs}>
        <button type="button" onClick={() => setTab('edit')} style={tab === 'edit' ? styles.tabActive : styles.tab}>
          Edit Details
        </button>
        <button type="button" onClick={() => setTab('history')} style={tab === 'history' ? styles.tabActive : styles.tab}>
          Audit History ({auditEvents.length})
        </button>
      </div>

      {tab === 'edit' ? (
        <form
          style={styles.form}
          onSubmit={(event) => {
            event.preventDefault()
            onSave({
              transactionId: detail.id,
              transactionDateRaw,
              description,
              signedAmountMinor: Math.round(Number(signedAmount || '0') * 100),
              normalizedType,
              categoryId: categoryId || null,
              category:
                categoryId
                  ? categoryOptions.find((option) => option.id === categoryId)?.label ?? null
                  : null,
              reference: reference.trim() ? reference.trim() : null,
              tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
              reviewStateOverride: reviewStateOverride || null
            })
          }}
        >
          <label style={styles.field}>
            <span style={styles.label}>Date</span>
            <input type="text" value={transactionDateRaw} onChange={(event) => setTransactionDateRaw(event.target.value)} style={styles.input} />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Description</span>
            <input type="text" value={description} onChange={(event) => setDescription(event.target.value)} style={styles.input} />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Amount</span>
            <input type="number" inputMode="decimal" value={signedAmount} onChange={(event) => setSignedAmount(event.target.value)} style={styles.input} />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Type</span>
            <select aria-label="Type" value={normalizedType} onChange={(event) => setNormalizedType(event.target.value as TransactionNormalizedType)} style={styles.input}>
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Category</span>
            <select aria-label="Category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} style={styles.input}>
              <option value="">No category</option>
              {categoryOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Reference</span>
            <input type="text" value={reference} onChange={(event) => setReference(event.target.value)} style={styles.input} />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Tags</span>
            <input type="text" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="travel, shared" style={styles.input} />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Review state override</span>
            <select value={reviewStateOverride} onChange={(event) => setReviewStateOverride(event.target.value as TransactionReviewState | '')} style={styles.input}>
              {reviewStateOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {ruleSuggestion ? (
            <div style={styles.ruleSuggestion}>
              <div style={styles.kicker}>Rule suggestion</div>
              <strong>{ruleSuggestion.title}</strong>
              <p style={styles.helper}>{ruleSuggestion.description}</p>
              {onUseRuleSuggestion ? (
                <div style={styles.actions}>
                  <button type="button" style={styles.secondaryButton} onClick={() => onUseRuleSuggestion(ruleSuggestion)}>
                    Create reusable rule
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div style={styles.actions}>
            <button type="submit" style={styles.primaryButton} disabled={saving}>
              {saving ? 'Saving...' : 'Save transaction'}
            </button>
          </div>
        </form>
      ) : (
        <div style={styles.historyList}>
          {auditEvents.length === 0 ? <p style={styles.helper}>No history available for this transaction.</p> : null}
          {auditEvents.map(event => (
            <div key={event.id} style={styles.historyItem}>
              <div style={styles.metaGrid}>
                <span style={styles.kicker}>{new Date(event.timestampISO).toLocaleString()}</span>
                <span style={styles.historyType}>{event.eventType}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}

const styles = {
  emptyDrawer: {
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.72)',
    boxShadow: 'var(--shadow-panel)'
  },
  drawer: {
    display: 'grid',
    gap: 'var(--space-lg)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.92)',
    boxShadow: 'var(--shadow-panel)'
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 'var(--space-sm)'
  },
  snapshot: {
    display: 'grid',
    gap: 'var(--space-sm)',
    paddingBottom: 'var(--space-md)',
    borderBottom: '1px solid rgba(30, 27, 22, 0.08)'
  },
  kicker: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-accent)'
  },
  heading: {
    margin: 0,
    fontSize: 'var(--font-heading-size)',
    lineHeight: 1.2
  },
  helper: {
    margin: 0,
    color: 'var(--color-muted)'
  },
  metaGrid: {
    display: 'grid',
    gap: 'var(--space-xs)',
    color: 'var(--color-muted)',
    fontSize: 14
  },
  form: {
    display: 'grid',
    gap: 'var(--space-md)'
  },
  field: {
    display: 'grid',
    gap: 'var(--space-xs)'
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-ink)'
  },
  input: {
    minHeight: 46,
    borderRadius: 16,
    border: '1px solid rgba(15, 118, 110, 0.18)',
    background: 'rgba(255, 255, 255, 0.9)',
    padding: '0 14px',
    color: 'var(--color-ink)'
  },
  ruleSuggestion: {
    display: 'grid',
    gap: 'var(--space-xs)',
    padding: 'var(--space-md)',
    borderRadius: 18,
    background: 'rgba(15, 118, 110, 0.08)',
    border: '1px solid rgba(15, 118, 110, 0.12)'
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 'var(--space-sm)',
    marginTop: 'var(--space-sm)'
  },
  closeButton: {
    minHeight: 40,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-ink)',
    padding: '0 16px',
    fontWeight: 600
  },
  secondaryButton: {
    minHeight: 42,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-ink)',
    padding: '0 16px',
    fontWeight: 600
  },
  primaryButton: {
    minHeight: 44,
    border: 0,
    borderRadius: 999,
    background: 'var(--color-accent)',
    color: '#fff',
    padding: '0 18px',
    fontWeight: 700
  },
  tabs: {
    display: 'flex',
    gap: 'var(--space-sm)',
    marginBottom: 'var(--space-md)'
  },
  tab: {
    background: 'none',
    border: 'none',
    padding: 'var(--space-xs) 0',
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-muted)',
    cursor: 'pointer'
  },
  tabActive: {
    background: 'none',
    border: 'none',
    padding: 'var(--space-xs) 0',
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--color-ink)',
    cursor: 'pointer',
    borderBottom: '2px solid var(--color-ink)'
  },
  historyList: {
    display: 'grid',
    gap: 'var(--space-sm)'
  },
  historyItem: {
    padding: 'var(--space-sm)',
    borderRadius: 'var(--radius-md)',
    background: 'rgba(255, 255, 255, 0.4)',
    border: '1px solid rgba(15, 118, 110, 0.08)'
  },
  historyType: {
    fontWeight: 600,
    color: 'var(--color-ink)'
  }
} as const
