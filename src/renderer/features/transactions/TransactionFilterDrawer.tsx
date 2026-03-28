import type { ChangeEvent } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { TransactionLedgerQuery, TransactionNormalizedType, TransactionReviewState } from '../../../shared/contracts/transactions'

interface TransactionFilterDrawerProps {
  filters: TransactionLedgerQuery
  advancedOpen: boolean
  onToggleAdvanced: () => void
  onChange: (next: TransactionLedgerQuery) => void
  onClear: () => void
}

const typeOptions: Array<{ value: TransactionNormalizedType; label: string }> = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'refund', label: 'Refund' },
  { value: 'atm-withdrawal', label: 'ATM withdrawal' },
  { value: 'credit-card-payment', label: 'Credit card payment' }
]

const reviewOptions: Array<{ value: TransactionReviewState; label: string }> = [
  { value: 'clean', label: 'Clean' },
  { value: 'pending-review', label: 'Pending review' }
]

const parseCsv = (value: string) =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

const toMajorAmount = (minor?: number) => (minor === undefined ? '' : String(minor / 100))

export const TransactionFilterDrawer = ({
  filters,
  advancedOpen,
  onToggleAdvanced,
  onChange,
  onClear
}: TransactionFilterDrawerProps) => {
  const onAmountChange = (field: 'amountMinMinor' | 'amountMaxMinor') => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.trim()
    onChange({
      ...filters,
      [field]: value ? Math.round(Number(value) * 100) : undefined
    })
  }

  const toggleType = (value: TransactionNormalizedType) => {
    const selected = filters.types ?? []
    const nextTypes = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]

    onChange({
      ...filters,
      types: nextTypes.length > 0 ? nextTypes : undefined
    })
  }

  const hasAdvancedFilters =
    Boolean(filters.dateFrom || filters.dateTo || filters.amountMinMinor !== undefined || filters.amountMaxMinor !== undefined) ||
    Boolean(filters.categories?.length || filters.tags?.length || filters.reviewStates?.length)

  return (
    <aside style={styles.drawer}>
      <div style={styles.header}>
        <div style={styles.headerCopy}>
          <div style={styles.kicker}>Ledger filters</div>
          <h3 style={styles.heading}>Quick type filters</h3>
          <p style={styles.helper}>Keep the common transaction types one tap away, and expand advanced filters only when you need them.</p>
        </div>
        <div style={styles.headerActions}>
          <button type="button" style={styles.secondaryButton} onClick={onClear}>
            Clear filters
          </button>
          <button
            type="button"
            aria-expanded={advancedOpen}
            aria-controls="advanced-ledger-filters"
            style={{ ...styles.secondaryButton, ...(advancedOpen ? styles.secondaryButtonActive : undefined) }}
            onClick={onToggleAdvanced}
          >
            {advancedOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            {advancedOpen ? 'Hide advanced filters' : 'Show advanced filters'}
          </button>
        </div>
      </div>

      <div style={styles.quickSection}>
        <span style={styles.quickLabel}>Types</span>
        <div style={styles.optionGrid}>
          {typeOptions.map((option) => {
            const checked = filters.types?.includes(option.value) ?? false
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={checked}
                style={{ ...styles.chip, ...(checked ? styles.chipActive : undefined) }}
                onClick={() => toggleType(option.value)}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {advancedOpen ? (
        <div id="advanced-ledger-filters" style={styles.advancedPanel}>
          <div style={styles.advancedHeader}>
            <div>
              <h4 style={styles.advancedHeading}>Advanced filters</h4>
              <p style={styles.advancedHelper}>
                Refine by dates, categories, amounts, tags, and review status.
                {hasAdvancedFilters ? ' These filters are currently affecting the ledger.' : ''}
              </p>
            </div>
          </div>

          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={styles.label}>Date from</span>
              <input type="date" value={filters.dateFrom ?? ''} onChange={(event) => onChange({ ...filters, dateFrom: event.target.value || undefined })} style={styles.input} />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Date to</span>
              <input type="date" value={filters.dateTo ?? ''} onChange={(event) => onChange({ ...filters, dateTo: event.target.value || undefined })} style={styles.input} />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Categories</span>
              <input
                type="text"
                value={filters.categories?.join(', ') ?? ''}
                onChange={(event) => onChange({ ...filters, categories: parseCsv(event.target.value) || undefined })}
                placeholder="Food, Bills"
                style={styles.input}
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Minimum amount</span>
              <input type="number" inputMode="decimal" value={toMajorAmount(filters.amountMinMinor)} onChange={onAmountChange('amountMinMinor')} style={styles.input} />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Maximum amount</span>
              <input type="number" inputMode="decimal" value={toMajorAmount(filters.amountMaxMinor)} onChange={onAmountChange('amountMaxMinor')} style={styles.input} />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Tags</span>
              <input
                type="text"
                value={filters.tags?.join(', ') ?? ''}
                onChange={(event) => onChange({ ...filters, tags: parseCsv(event.target.value) || undefined })}
                placeholder="travel, shared"
                style={styles.input}
              />
            </label>
          </div>

          <div style={styles.pillSection}>
            <div style={styles.field}>
              <span style={styles.label}>Review state</span>
              <div style={styles.optionGrid}>
                {reviewOptions.map((option) => {
                  const checked = filters.reviewStates?.includes(option.value) ?? false
                  return (
                    <label key={option.value} style={{ ...styles.checkboxLabel, ...(checked ? styles.checkboxLabelActive : undefined) }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          onChange({
                            ...filters,
                            reviewStates: event.target.checked
                              ? [...(filters.reviewStates ?? []), option.value]
                              : (filters.reviewStates ?? []).filter((value) => value !== option.value)
                          })
                        }
                      />
                      <span>{option.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  )
}

const styles = {
  drawer: {
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(226, 215, 197, 0.8)',
    boxShadow: 'var(--shadow-panel)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-md)',
    alignItems: 'start',
    flexWrap: 'wrap' as const
  },
  headerCopy: {
    display: 'grid',
    gap: 'var(--space-xs)'
  },
  headerActions: {
    display: 'flex',
    gap: 'var(--space-sm)',
    flexWrap: 'wrap' as const
  },
  kicker: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-accent)'
  },
  heading: {
    margin: 0,
    fontSize: 36,
    lineHeight: 1.1
  },
  helper: {
    margin: 0,
    color: 'var(--color-muted)',
    fontSize: 14
  },
  quickSection: {
    display: 'grid',
    gap: 'var(--space-sm)',
    paddingTop: 'var(--space-xs)'
  },
  quickLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-ink)'
  },
  optionGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 'var(--space-sm)'
  },
  chip: {
    minHeight: 40,
    padding: '0 16px',
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.12)',
    background: 'rgba(255, 255, 255, 0.78)',
    color: 'var(--color-ink)',
    fontWeight: 600
  },
  chipActive: {
    border: '1px solid rgba(15, 118, 110, 0.26)',
    background: 'rgba(15, 118, 110, 0.12)',
    color: 'var(--color-accent)'
  },
  advancedPanel: {
    display: 'grid',
    gap: 'var(--space-md)',
    paddingTop: 'var(--space-sm)',
    borderTop: '1px solid rgba(30, 27, 22, 0.08)'
  },
  advancedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-md)',
    alignItems: 'start'
  },
  advancedHeading: {
    margin: 0,
    fontSize: 22,
    lineHeight: 1.2
  },
  advancedHelper: {
    margin: 'var(--space-xs) 0 0 0',
    color: 'var(--color-muted)',
    fontSize: 14
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 'var(--space-md)'
  },
  field: {
    display: 'grid',
    gap: 'var(--space-sm)'
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
    background: 'rgba(255, 255, 255, 0.86)',
    padding: '0 14px',
    color: 'var(--color-ink)'
  },
  pillSection: {
    display: 'grid',
    gap: 'var(--space-md)'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    color: 'var(--color-ink)',
    padding: '10px 14px',
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.12)',
    background: 'rgba(255, 255, 255, 0.78)'
  },
  checkboxLabelActive: {
    border: '1px solid rgba(15, 118, 110, 0.26)',
    background: 'rgba(15, 118, 110, 0.08)',
    color: 'var(--color-accent)'
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-ink)',
    padding: '0 18px',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-sm)'
  },
  secondaryButtonActive: {
    border: '1px solid rgba(15, 118, 110, 0.24)',
    background: 'rgba(15, 118, 110, 0.08)',
    color: 'var(--color-accent)'
  }
} as const
