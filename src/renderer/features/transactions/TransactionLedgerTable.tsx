import { ArrowDown, ArrowUp, ArrowUpDown, Pencil } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { TransactionLedgerRow } from '../../../shared/contracts/transactions'

interface TransactionLedgerTableProps {
  rows: TransactionLedgerRow[]
  loading: boolean
  activeTransactionId?: string
  sortKey: SortKey
  sortDirection: SortDirection
  selectedIds: Set<string>
  onSelect: (id: string, checked: boolean, shiftHeld: boolean) => void
  onSelectAll: (checked: boolean) => void
  onSort: (key: SortKey) => void
  onOpen: (transactionId: string) => void
}

export type SortKey = 'date' | 'debit' | 'credit' | 'balance'
export type SortDirection = 'asc' | 'desc'

const formatAmount = (minor?: number | null) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format((minor ?? 0) / 100)

const typeLabelMap: Record<TransactionLedgerRow['normalizedType'], string> = {
  expense: 'Expense',
  income: 'Income',
  transfer: 'Transfer',
  refund: 'Refund',
  'atm-withdrawal': 'ATM withdrawal',
  'credit-card-payment': 'Credit card payment'
}

const SortIcon = ({ active, direction }: { active: boolean; direction: SortDirection }) => {
  if (!active) {
    return <ArrowUpDown size={14} />
  }

  return direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
}

export const TransactionLedgerTable = ({
  rows,
  loading,
  activeTransactionId,
  sortKey,
  sortDirection,
  selectedIds,
  onSelect,
  onSelectAll,
  onSort,
  onOpen
}: TransactionLedgerTableProps) => {
  const selectAllRef = useRef<HTMLInputElement>(null)

  const selectedOnPage = rows.filter((row) => selectedIds.has(row.id)).length
  const allSelected = rows.length > 0 && selectedOnPage === rows.length
  const someSelected = selectedOnPage > 0 && selectedOnPage < rows.length

  // React does not support declarative `indeterminate` — set via ref
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected
    }
  }, [someSelected])

  if (loading) {
    return <section style={styles.loadingCard}>Loading transactions...</section>
  }

  return (
    <section style={styles.card}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{ ...styles.headerCell, width: 40, padding: 'var(--space-md)' }}>
              <input
                type="checkbox"
                ref={selectAllRef}
                aria-label="Select all on this page"
                checked={allSelected}
                onChange={(e) => onSelectAll(e.currentTarget.checked)}
              />
            </th>
            <th style={styles.headerCell}>
              <button type="button" style={styles.sortButton} onClick={() => onSort('date')}>
                Date
                <SortIcon active={sortKey === 'date'} direction={sortDirection} />
              </button>
            </th>
            <th style={styles.headerCell}>Description</th>
            <th style={styles.headerCell}>
              <button type="button" style={styles.sortButton} onClick={() => onSort('debit')}>
                Debited
                <SortIcon active={sortKey === 'debit'} direction={sortDirection} />
              </button>
            </th>
            <th style={styles.headerCell}>
              <button type="button" style={styles.sortButton} onClick={() => onSort('credit')}>
                Credited
                <SortIcon active={sortKey === 'credit'} direction={sortDirection} />
              </button>
            </th>
            <th style={styles.headerCell}>
              <button type="button" style={styles.sortButton} onClick={() => onSort('balance')}>
                Balance
                <SortIcon active={sortKey === 'balance'} direction={sortDirection} />
              </button>
            </th>
            <th style={styles.headerCell}>Type</th>
            <th style={styles.headerCell}>Tags</th>
            <th style={styles.headerCell}>Edit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSelected = selectedIds.has(row.id)
            return (
              <tr
                key={row.id}
                style={{
                  ...styles.row,
                  ...(activeTransactionId === row.id ? styles.rowActive : undefined),
                  ...(isSelected ? styles.rowSelected : undefined)
                }}
              >
                <td style={{ ...styles.cellMeta, width: 40, padding: 'var(--space-md)' }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    aria-label={`Select ${row.description}`}
                    onChange={(e) => {
                      const shiftHeld = (e.nativeEvent as MouseEvent).shiftKey
                      onSelect(row.id, e.currentTarget.checked, shiftHeld)
                    }}
                  />
                </td>
                <td style={styles.cellMeta}>{row.transactionDateRaw}</td>
                <td style={styles.cellPrimary}>
                  <div style={styles.description}>{row.description}</div>
                  {row.reference ? <div style={styles.reference}>{row.reference}</div> : null}
                </td>
                <td style={styles.cellAmount}>{row.debitAmountMinor ? formatAmount(row.debitAmountMinor) : '-'}</td>
                <td style={{ ...styles.cellAmount, color: row.creditAmountMinor ? 'var(--color-accent)' : 'var(--color-muted)' }}>
                  {row.creditAmountMinor ? formatAmount(row.creditAmountMinor) : '-'}
                </td>
                <td style={styles.cellAmount}>{row.runningBalanceMinor !== undefined ? formatAmount(row.runningBalanceMinor) : '-'}</td>
                <td style={styles.cellMeta}>
                  <span style={styles.typePill}>{typeLabelMap[row.normalizedType]}</span>
                </td>
                <td style={styles.cellMeta}>
                  <div style={styles.tagsWrap}>
                    {row.tags.length ? row.tags.map((tag) => <span key={tag} style={styles.tag}>{tag}</span>) : <span style={styles.reference}>No tags</span>}
                  </div>
                </td>
                <td style={styles.cellMeta}>
                  <button
                    type="button"
                    aria-label={`Edit transaction ${row.description}`}
                    style={styles.editButton}
                    onClick={() => onOpen(row.id)}
                  >
                    <Pencil size={16} />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

const styles = {
  loadingCard: {
    display: 'grid',
    padding: 'var(--space-xl)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.72)',
    boxShadow: 'var(--shadow-panel)'
  },
  card: {
    overflow: 'hidden',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.72)',
    boxShadow: 'var(--shadow-panel)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const
  },
  headerCell: {
    textAlign: 'left' as const,
    padding: 'var(--space-md) var(--space-lg)',
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--color-muted)',
    borderBottom: '1px solid rgba(30, 27, 22, 0.08)',
    whiteSpace: 'nowrap' as const
  },
  sortButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-xs)',
    border: 0,
    padding: 0,
    background: 'transparent',
    color: 'inherit',
    font: 'inherit',
    fontWeight: 700
  },
  row: {
    outline: 'none'
  },
  rowActive: {
    background: 'rgba(15, 118, 110, 0.08)'
  },
  rowSelected: {
    background: 'rgba(15, 118, 110, 0.06)'
  },
  cellPrimary: {
    padding: 'var(--space-md) var(--space-lg)',
    borderBottom: '1px solid rgba(30, 27, 22, 0.06)',
    verticalAlign: 'top' as const
  },
  cellMeta: {
    padding: 'var(--space-md) var(--space-lg)',
    borderBottom: '1px solid rgba(30, 27, 22, 0.06)',
    verticalAlign: 'top' as const,
    color: 'var(--color-muted)'
  },
  cellAmount: {
    padding: 'var(--space-md) var(--space-lg)',
    borderBottom: '1px solid rgba(30, 27, 22, 0.06)',
    verticalAlign: 'top' as const,
    fontWeight: 700,
    whiteSpace: 'nowrap' as const,
    color: 'var(--color-ink)'
  },
  description: {
    fontWeight: 600,
    color: 'var(--color-ink)'
  },
  reference: {
    marginTop: 'var(--space-xs)',
    fontSize: 13,
    color: 'var(--color-muted)'
  },
  typePill: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 28,
    padding: '0 12px',
    borderRadius: 999,
    background: 'rgba(15, 118, 110, 0.08)',
    color: 'var(--color-accent)',
    fontSize: 13,
    fontWeight: 700
  },
  tagsWrap: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 'var(--space-xs)'
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 28,
    padding: '0 10px',
    borderRadius: 999,
    background: 'rgba(30, 27, 22, 0.06)',
    color: 'var(--color-ink)',
    fontSize: 13,
    fontWeight: 600
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    border: '1px solid rgba(30, 27, 22, 0.12)',
    background: 'rgba(255, 255, 255, 0.72)',
    color: 'var(--color-ink)',
    display: 'grid',
    placeItems: 'center'
  }
} as const
