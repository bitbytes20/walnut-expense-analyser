import { useCallback, useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type {
  CategoryOption,
  CreateCategorizationRuleInput,
  DescriptionTerm,
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

const REDOS_RISK_PATTERNS = [
  /\([^)]*[+*][^)]*\)[+*]/,   // (x+)+ nested quantifiers
  /\([^)]*\|[^)]*\)[+*]/,     // (a|b)+ alternation + quantifier
  /\.[+*][+*]/,               // .++ repetition
]

export const detectReDoSRisk = (pattern: string): boolean =>
  REDOS_RISK_PATTERNS.some((check) => check.test(pattern))

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
  const [descriptionTerms, setDescriptionTerms] = useState<DescriptionTerm[]>([{ op: 'contains', value: '' }])
  const [transactionType, setTransactionType] = useState<TransactionNormalizedType | ''>('')
  const [direction, setDirection] = useState<'debit' | 'credit' | ''>('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [tags, setTags] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [actionType, setActionType] = useState<TransactionNormalizedType | ''>('')
  const [appendTags, setAppendTags] = useState('')
  const [previewCounts, setPreviewCounts] = useState<Record<number, number | null>>({})
  const debounceTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    const source = rule
      ? {
          name: rule.name,
          condition: rule.condition,
          action: rule.action
        }
      : draft
    setName(source?.name ?? '')
    const terms = source?.condition.descriptionTerms ?? []
    setDescriptionTerms(terms.length > 0 ? terms : [{ op: 'contains', value: '' }])
    setTransactionType(source?.condition.transactionTypes[0] ?? '')
    setDirection(source?.condition.directions[0] ?? '')
    setAmountMin(source?.condition.amountMinMinor !== undefined ? String(source.condition.amountMinMinor / 100) : '')
    setAmountMax(source?.condition.amountMaxMinor !== undefined ? String(source.condition.amountMaxMinor / 100) : '')
    setTags((source?.condition.tags ?? []).join(', '))
    setCategoryId(source?.action.categoryId ?? '')
    setActionType(source?.action.type ?? '')
    setAppendTags((source?.action.appendTags ?? []).join(', '))
  }, [draft, rule])

  const fetchPreviewCount = useCallback((index: number, term: DescriptionTerm) => {
    if (!term.value.trim() || term.op !== 'regex') {
      setPreviewCounts((prev) => ({ ...prev, [index]: null }))
      return
    }
    if (debounceTimers.current[index]) {
      clearTimeout(debounceTimers.current[index])
    }
    debounceTimers.current[index] = setTimeout(async () => {
      try {
        const result = await window.walnut.testRule({
          condition: { descriptionTerms: [term], transactionTypes: [], tags: [], directions: [] },
          action: { appendTags: [] }
        })
        setPreviewCounts((prev) => ({ ...prev, [index]: result.matchCount }))
      } catch {
        setPreviewCounts((prev) => ({ ...prev, [index]: null }))
      }
    }, 300)
  }, [])

  const updateTerm = (index: number, updated: Partial<DescriptionTerm>) => {
    setDescriptionTerms((prev) => {
      const next = prev.map((t, i) => i === index ? { ...t, ...updated } as DescriptionTerm : t)
      fetchPreviewCount(index, next[index])
      return next
    })
  }

  const addTerm = () => {
    setDescriptionTerms((prev) => [...prev, { op: 'contains', value: '' }])
  }

  const removeTerm = (index: number) => {
    if (descriptionTerms.length <= 1) return
    setDescriptionTerms((prev) => prev.filter((_, i) => i !== index))
    setPreviewCounts((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }

  const buildPayload = (): CreateCategorizationRuleInput | UpdateCategorizationRuleInput => {
    const payload = {
      name,
      condition: {
        descriptionTerms: descriptionTerms.filter((t) => t.value.trim().length > 0),
        amountMinMinor: amountMin ? Math.round(Number(amountMin) * 100) : undefined,
        amountMaxMinor: amountMax ? Math.round(Number(amountMax) * 100) : undefined,
        transactionTypes: transactionType ? [transactionType] : [],
        tags: tags.split(',').map((item) => item.trim()).filter(Boolean),
        directions: direction ? [direction as 'debit' | 'credit'] : []
      },
      action: {
        categoryId: categoryId || undefined,
        type: actionType ? actionType as TransactionNormalizedType : undefined,
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

      {/* Dynamic condition row list */}
      <div>
        <span style={styles.label}>Description conditions</span>
        <div style={{ marginTop: 'var(--space-xs)' }}>
          {descriptionTerms.map((term, index) => (
            <div key={index}>
              {index > 0 && (
                <div style={styles.andBadgeRow}>
                  <span style={styles.andBadge}>AND</span>
                </div>
              )}
              <div style={styles.conditionRow}>
                <select
                  value={term.op}
                  onChange={(e) => updateTerm(index, { op: e.target.value as DescriptionTerm['op'] })}
                  style={styles.opSelect}
                  aria-label={`Condition ${index + 1} operator`}
                >
                  <option value="contains">Contains</option>
                  <option value="starts-with">Starts with</option>
                  <option value="ends-with">Ends with</option>
                  <option value="regex">Regex</option>
                </select>
                <input
                  type="text"
                  value={term.value}
                  onChange={(e) => updateTerm(index, { value: e.target.value })}
                  placeholder={term.op === 'regex' ? 'Regular expression (e.g. ^Uber)' : 'Value'}
                  style={styles.termInput}
                  aria-label={`Condition ${index + 1} value`}
                />
                <button
                  type="button"
                  onClick={() => removeTerm(index)}
                  disabled={descriptionTerms.length <= 1}
                  style={{
                    ...styles.deleteTermButton,
                    opacity: descriptionTerms.length <= 1 ? 0.3 : 1,
                    cursor: descriptionTerms.length <= 1 ? 'not-allowed' : 'pointer'
                  }}
                  aria-label={`Remove condition ${index + 1}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {term.op === 'regex' && term.value.trim() && (
                <div style={{ marginTop: 4 }}>
                  {detectReDoSRisk(term.value) && (
                    <span style={styles.redosBadge}>Caution: complex pattern</span>
                  )}
                  <div style={styles.previewCount}>
                    {previewCounts[index] === null || previewCounts[index] === undefined
                      ? null
                      : previewCounts[index] === 0
                        ? 'No transactions match this pattern'
                        : `${previewCounts[index]} transactions match this pattern`
                    }
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <button type="button" style={styles.addConditionButton} onClick={addTerm}>
          Add condition
        </button>
      </div>

      {/* Amount range section */}
      <div style={{ marginTop: 'var(--space-xl)' }}>
        <span style={styles.label}>Amount</span>
        <div style={{ ...styles.grid, marginTop: 'var(--space-xs)' }}>
          <label style={styles.field}>
            <span style={styles.sublabel}>Greater than</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={amountMin}
              onChange={(event) => setAmountMin(event.target.value)}
              placeholder="&#8377; amount"
              style={styles.input}
            />
          </label>
          <label style={styles.field}>
            <span style={styles.sublabel}>Less than</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={amountMax}
              onChange={(event) => setAmountMax(event.target.value)}
              placeholder="&#8377; amount"
              style={styles.input}
            />
          </label>
        </div>
      </div>

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
        <button type="button" style={styles.secondaryButton} onClick={() => {
          const p = buildPayload()
          onTest({ condition: p.condition!, action: p.action! })
        }}>
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
  sublabel: {
    fontSize: 13,
    fontWeight: 400,
    color: 'var(--color-muted)'
  },
  input: {
    minHeight: 44,
    borderRadius: 16,
    border: '1px solid rgba(15, 118, 110, 0.18)',
    background: 'rgba(255, 255, 255, 0.9)',
    padding: '0 14px'
  },
  conditionRow: {
    display: 'flex',
    gap: 'var(--space-xs)',
    alignItems: 'center'
  },
  opSelect: {
    minHeight: 36,
    borderRadius: 12,
    border: '1px solid rgba(15, 118, 110, 0.18)',
    background: 'rgba(255, 255, 255, 0.9)',
    padding: '0 8px',
    fontSize: 13,
    flexShrink: 0
  },
  termInput: {
    minHeight: 36,
    flex: 1,
    borderRadius: 12,
    border: '1px solid rgba(15, 118, 110, 0.18)',
    background: 'rgba(255, 255, 255, 0.9)',
    padding: '0 12px',
    fontSize: 13
  },
  deleteTermButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    color: 'var(--color-muted)',
    flexShrink: 0,
    padding: 0
  },
  andBadgeRow: {
    display: 'flex',
    justifyContent: 'flex-start',
    paddingLeft: 4,
    margin: '4px 0'
  },
  andBadge: {
    fontSize: 12,
    color: 'var(--color-muted)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '2px 6px'
  },
  addConditionButton: {
    marginTop: 8,
    width: '100%',
    minHeight: 36,
    border: '1px dashed var(--color-border)',
    borderRadius: 12,
    background: 'transparent',
    color: 'var(--color-ink)',
    fontSize: 13,
    cursor: 'pointer'
  },
  redosBadge: {
    display: 'inline-block',
    fontSize: 12,
    border: '1px solid var(--color-destructive)',
    color: 'var(--color-destructive)',
    borderRadius: 'var(--radius-md)',
    padding: '2px 8px',
    marginBottom: 2
  },
  previewCount: {
    fontSize: 12,
    color: 'var(--color-muted)'
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
