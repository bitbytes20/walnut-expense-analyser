import { useEffect, useState } from 'react'
import type {
  CategoryOption,
  CreateCategorizationRuleInput,
  RulePreviewInput,
  UpdateCategorizationRuleInput,
  CategorizationRuleSummary
} from '../../../shared/contracts/categories'
import type { TransactionNormalizedType, TransactionRuleSuggestion } from '../../../shared/contracts/transactions'

interface RuleEditorPanelProps {
  mode: 'create' | 'edit'
  rule?: CategorizationRuleSummary
  draft?: TransactionRuleSuggestion['draft']
  categoryOptions: CategoryOption[]
  onClose: () => void
  onSave: (input: CreateCategorizationRuleInput | UpdateCategorizationRuleInput, previewAfterSave?: boolean) => void
  onDelete: (ruleId: string) => void
  onTest: (input: RulePreviewInput) => void
  onPreviewApply: (input: CreateCategorizationRuleInput | UpdateCategorizationRuleInput) => void
}

const typeOptions: Array<{ value: TransactionNormalizedType; label: string }> = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'refund', label: 'Refund' },
  { value: 'atm-withdrawal', label: 'ATM withdrawal' },
  { value: 'credit-card-payment', label: 'Credit card payment' }
]

export const RuleEditorPanel = ({
  mode,
  rule,
  draft,
  categoryOptions,
  onClose,
  onSave,
  onDelete,
  onTest,
  onPreviewApply
}: RuleEditorPanelProps) => {
  const [name, setName] = useState('')
  const [descriptionKeywords, setDescriptionKeywords] = useState('')
  const [transactionType, setTransactionType] = useState<TransactionNormalizedType | ''>('')
  const [direction, setDirection] = useState<'debit' | 'credit' | ''>('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [tags, setTags] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [actionType, setActionType] = useState<TransactionNormalizedType | ''>('')
  const [appendTags, setAppendTags] = useState('')

  useEffect(() => {
    const source = rule
      ? {
          name: rule.name,
          condition: rule.condition,
          action: rule.action
        }
      : draft
    setName(source?.name ?? '')
    setDescriptionKeywords((source?.condition.descriptionContains ?? []).join(', '))
    setTransactionType(source?.condition.transactionTypes[0] ?? '')
    setDirection(source?.condition.directions[0] ?? '')
    setAmountMin(source?.condition.amountMinMinor !== undefined ? String(source.condition.amountMinMinor / 100) : '')
    setAmountMax(source?.condition.amountMaxMinor !== undefined ? String(source.condition.amountMaxMinor / 100) : '')
    setTags((source?.condition.tags ?? []).join(', '))
    setCategoryId(source?.action.categoryId ?? '')
    setActionType(source?.action.type ?? '')
    setAppendTags((source?.action.appendTags ?? []).join(', '))
  }, [draft, rule])

  const buildPayload = (): CreateCategorizationRuleInput | UpdateCategorizationRuleInput => {
    const payload = {
      name,
      condition: {
        descriptionContains: descriptionKeywords.split(',').map((item) => item.trim()).filter(Boolean),
        amountMinMinor: amountMin ? Math.round(Number(amountMin) * 100) : undefined,
        amountMaxMinor: amountMax ? Math.round(Number(amountMax) * 100) : undefined,
        transactionTypes: transactionType ? [transactionType] : [],
        tags: tags.split(',').map((item) => item.trim()).filter(Boolean),
        directions: direction ? [direction] : []
      },
      action: {
        categoryId: categoryId || undefined,
        type: actionType || undefined,
        appendTags: appendTags.split(',').map((item) => item.trim()).filter(Boolean)
      }
    }

    return mode === 'edit'
      ? {
          ruleId: rule!.id,
          ...payload
        }
      : payload
  }

  return (
    <aside style={styles.panel}>
      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>{mode === 'create' ? 'New rule' : 'Edit rule'}</div>
          <h3 style={styles.heading}>{mode === 'create' ? 'Create reusable rule' : rule?.name}</h3>
        </div>
        <button type="button" style={styles.secondaryButton} onClick={onClose}>
          Close
        </button>
      </div>

      <label style={styles.field}>
        <span style={styles.label}>Rule name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} style={styles.input} />
      </label>
      <label style={styles.field}>
        <span style={styles.label}>Description keywords</span>
        <input value={descriptionKeywords} onChange={(event) => setDescriptionKeywords(event.target.value)} placeholder="burger, king" style={styles.input} />
      </label>
      <div style={styles.grid}>
        <label style={styles.field}>
          <span style={styles.label}>Transaction type</span>
          <select value={transactionType} onChange={(event) => setTransactionType(event.target.value as TransactionNormalizedType | '')} style={styles.input}>
            <option value="">Any</option>
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label style={styles.field}>
          <span style={styles.label}>Direction</span>
          <select value={direction} onChange={(event) => setDirection(event.target.value as 'debit' | 'credit' | '')} style={styles.input}>
            <option value="">Any</option>
            <option value="debit">Debit</option>
            <option value="credit">Credit</option>
          </select>
        </label>
      </div>
      <div style={styles.grid}>
        <label style={styles.field}>
          <span style={styles.label}>Minimum amount</span>
          <input value={amountMin} onChange={(event) => setAmountMin(event.target.value)} style={styles.input} />
        </label>
        <label style={styles.field}>
          <span style={styles.label}>Maximum amount</span>
          <input value={amountMax} onChange={(event) => setAmountMax(event.target.value)} style={styles.input} />
        </label>
      </div>
      <label style={styles.field}>
        <span style={styles.label}>Must already have tags</span>
        <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="food, shared" style={styles.input} />
      </label>
      <label style={styles.field}>
        <span style={styles.label}>Assign category</span>
        <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} style={styles.input}>
          <option value="">No category change</option>
          {categoryOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div style={styles.grid}>
        <label style={styles.field}>
          <span style={styles.label}>Set transaction type</span>
          <select value={actionType} onChange={(event) => setActionType(event.target.value as TransactionNormalizedType | '')} style={styles.input}>
            <option value="">No type change</option>
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label style={styles.field}>
          <span style={styles.label}>Append tags</span>
          <input value={appendTags} onChange={(event) => setAppendTags(event.target.value)} placeholder="restaurant" style={styles.input} />
        </label>
      </div>

      <div style={styles.actions}>
        <button type="button" style={styles.secondaryButton} onClick={() => onTest(buildPayload())}>
          Test rule
        </button>
        <button type="button" style={styles.secondaryButton} onClick={() => onPreviewApply(buildPayload())}>
          Preview existing
        </button>
        <button type="button" style={styles.primaryButton} onClick={() => onSave(buildPayload())}>
          Save rule
        </button>
      </div>

      {mode === 'edit' && rule ? (
        <div style={styles.actions}>
          <button type="button" style={styles.destructiveButton} onClick={() => onDelete(rule.id)}>
            Delete rule
          </button>
        </div>
      ) : null}
    </aside>
  )
}

const styles = {
  panel: {
    position: 'fixed' as const,
    top: 110,
    right: 24,
    bottom: 24,
    width: 460,
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.96)',
    boxShadow: 'var(--shadow-panel)',
    zIndex: 30,
    overflowY: 'auto' as const
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-md)'
  },
  kicker: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-accent)'
  },
  heading: {
    margin: 'var(--space-xs) 0 0 0',
    fontSize: 24
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 'var(--space-sm)'
  },
  field: {
    display: 'grid',
    gap: 'var(--space-xs)'
  },
  label: {
    fontSize: 14,
    fontWeight: 600
  },
  input: {
    minHeight: 44,
    borderRadius: 16,
    border: '1px solid rgba(15, 118, 110, 0.18)',
    background: 'rgba(255, 255, 255, 0.9)',
    padding: '0 14px'
  },
  actions: {
    display: 'flex',
    gap: 'var(--space-sm)',
    flexWrap: 'wrap' as const
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
    minHeight: 42,
    border: 0,
    borderRadius: 999,
    background: 'var(--color-accent)',
    color: '#fff',
    padding: '0 16px',
    fontWeight: 700
  },
  destructiveButton: {
    minHeight: 42,
    borderRadius: 999,
    border: '1px solid rgba(180, 35, 24, 0.24)',
    background: 'rgba(180, 35, 24, 0.08)',
    color: 'var(--color-destructive)',
    padding: '0 16px',
    fontWeight: 700
  }
} as const
