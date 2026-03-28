import { Filter, Search } from 'lucide-react'
import { startTransition, useEffect, useMemo, useState } from 'react'
import type {
  TransactionDetail,
  TransactionLedgerQuery,
  TransactionLedgerRow,
  TransactionRuleSuggestion
} from '../../../shared/contracts/transactions'
import { TransactionDetailDrawer } from './TransactionDetailDrawer'
import { TransactionEmptyState } from './TransactionEmptyState'
import { TransactionFilterDrawer } from './TransactionFilterDrawer'
import { TransactionLedgerTable, type SortDirection, type SortKey } from './TransactionLedgerTable'

const pageSizeOptions = [10, 25, 50, 75, 100, 150, 200] as const

const formatAmount = (minor: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(minor / 100)

interface TransactionsScreenProps {
  onUseRuleSuggestion?: (suggestion: TransactionRuleSuggestion) => void
}

export const TransactionsScreen = ({ onUseRuleSuggestion }: TransactionsScreenProps) => {
  const [pendingSearch, setPendingSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [filters, setFilters] = useState<TransactionLedgerQuery>({})
  const [rows, setRows] = useState<TransactionLedgerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false)
  const [activeTransactionId, setActiveTransactionId] = useState<string>()
  const [detail, setDetail] = useState<TransactionDetail>()
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ruleSuggestion, setRuleSuggestion] = useState<TransactionRuleSuggestion>()
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [pageSize, setPageSize] = useState<number>(50)
  const [currentPage, setCurrentPage] = useState<number>(1)

  useEffect(() => {
    let cancelled = false
    const loadRows = async () => {
      setLoading(true)
      try {
        const nextRows = await window.walnut.listTransactions({
          ...filters,
          search: submittedSearch || undefined
        })
        if (cancelled) {
          return
        }
        startTransition(() => {
          setRows(nextRows)
          if (activeTransactionId && !nextRows.some((row) => row.id === activeTransactionId)) {
            setActiveTransactionId(undefined)
            setDetail(undefined)
          }
        })
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadRows()
    return () => {
      cancelled = true
    }
  }, [activeTransactionId, submittedSearch, filters])

  useEffect(() => {
    setCurrentPage(1)
  }, [submittedSearch, filters])

  const openTransaction = async (transactionId: string) => {
    setActiveTransactionId(transactionId)
    setDetailLoading(true)
    try {
      const nextDetail = await window.walnut.getTransactionDetail({ transactionId })
      setDetail(nextDetail)
      setRuleSuggestion(undefined)
    } finally {
      setDetailLoading(false)
    }
  }

  const hasFilters =
    Boolean(submittedSearch.trim()) ||
    Boolean(filters.dateFrom || filters.dateTo || filters.amountMinMinor !== undefined || filters.amountMaxMinor !== undefined) ||
    Boolean(filters.categories?.length || filters.tags?.length || filters.types?.length || filters.reviewStates?.length)

  const sortedRows = useMemo(() => {
    return [...rows].sort((left, right) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1

      if (sortKey === 'date') {
        return left.transactionDateSortable.localeCompare(right.transactionDateSortable) * multiplier
      }
      if (sortKey === 'debit') {
        return ((left.debitAmountMinor ?? 0) - (right.debitAmountMinor ?? 0)) * multiplier
      }
      if (sortKey === 'credit') {
        return ((left.creditAmountMinor ?? 0) - (right.creditAmountMinor ?? 0)) * multiplier
      }

      return ((left.runningBalanceMinor ?? 0) - (right.runningBalanceMinor ?? 0)) * multiplier
    })
  }, [rows, sortDirection, sortKey])

  const totalExpenseMinor = useMemo(
    () => sortedRows.reduce((total, row) => total + (row.debitAmountMinor ?? 0), 0),
    [sortedRows]
  )

  const totalIncomeMinor = useMemo(
    () => sortedRows.reduce((total, row) => total + (row.creditAmountMinor ?? 0), 0),
    [sortedRows]
  )

  const totalDifferenceMinor = useMemo(() => totalIncomeMinor - totalExpenseMinor, [totalExpenseMinor, totalIncomeMinor])

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize))

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

  const pageStartIndex = sortedRows.length === 0 ? 0 : (currentPage - 1) * pageSize
  const pagedRows = sortedRows.slice(pageStartIndex, pageStartIndex + pageSize)
  const pageStartLabel = sortedRows.length === 0 ? 0 : pageStartIndex + 1
  const pageEndLabel = Math.min(pageStartIndex + pageSize, sortedRows.length)

  return (
    <section style={styles.root}>
      <section style={styles.headerCard}>
        <div>
          <div style={styles.kicker}>Transaction workspace</div>
          <h2 style={styles.heading}>Transactions</h2>
          <p style={styles.helper}>Browse imported records, sort the ledger, and open edits from the pencil action without leaving the workspace.</p>
        </div>
        <div style={styles.toolbar}>
          <button type="button" style={styles.secondaryButton} onClick={() => setFiltersOpen((current) => !current)}>
            <Filter size={18} />
            {filtersOpen ? 'Hide filters' : 'Show filters'}
          </button>
        </div>
      </section>

      {filtersOpen ? (
        <TransactionFilterDrawer
          filters={filters}
          advancedOpen={advancedFiltersOpen}
          onToggleAdvanced={() => setAdvancedFiltersOpen((current) => !current)}
          onChange={setFilters}
          onClear={() => setFilters({})}
        />
      ) : null}

      <section style={styles.resultMeta}>
        <span>{sortedRows.length} total transactions</span>
        <span>{hasFilters ? 'Filtered view' : 'All imported transactions'}</span>
      </section>

      <section style={styles.summaryGrid}>
        <article style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Total Debited</div>
          <div style={styles.summaryValue}>{formatAmount(totalExpenseMinor)}</div>
          <div style={styles.summaryHelper}>Tracks the debit total for the currently filtered list.</div>
        </article>
        <article style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Total Credited</div>
          <div style={{ ...styles.summaryValue, color: 'var(--color-accent)' }}>{formatAmount(totalIncomeMinor)}</div>
          <div style={styles.summaryHelper}>Tracks the credit total for the currently filtered list.</div>
        </article>
        <article style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Difference</div>
          <div
            style={{
              ...styles.summaryValue,
              color: totalDifferenceMinor >= 0 ? 'var(--color-accent)' : 'var(--color-ink)'
            }}
          >
            {formatAmount(totalDifferenceMinor)}
          </div>
          <div style={styles.summaryHelper}>Shows credited minus debited for the currently filtered list.</div>
        </article>
      </section>

      <div style={styles.layout}>
        <div style={styles.ledgerColumn}>
          {sortedRows.length === 0 && !loading ? (
            <TransactionEmptyState hasFilters={hasFilters} />
          ) : (
            <>
              <section style={styles.paginationBar}>
                <div style={styles.paginationMeta}>
                  <span>
                    Showing {pageStartLabel}-{pageEndLabel} of {sortedRows.length}
                  </span>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                </div>

                <form
                  style={styles.inlineSearchForm}
                  onSubmit={(event) => {
                    event.preventDefault()
                    setSubmittedSearch(pendingSearch.trim())
                  }}
                >
                  <label style={styles.inlineSearchWrap}>
                    <Search size={16} color="var(--color-muted)" />
                    <input
                      aria-label="Search descriptions"
                      type="search"
                      value={pendingSearch}
                      onChange={(event) => setPendingSearch(event.target.value)}
                      placeholder="Search descriptions"
                      style={styles.inlineSearchInput}
                    />
                  </label>
                  <button type="submit" style={styles.secondaryButton}>
                    <Search size={16} />
                    Search
                  </button>
                </form>

                <div style={styles.paginationControls}>
                  <label style={styles.pageSizeWrap}>
                    <span>Rows per page</span>
                    <select
                      aria-label="Rows per page"
                      value={String(pageSize)}
                      onChange={(event) => {
                        setPageSize(Number(event.target.value))
                        setCurrentPage(1)
                      }}
                      style={styles.pageSizeSelect}
                    >
                      {pageSizeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div style={styles.pageButtons}>
                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </section>

              <TransactionLedgerTable
                rows={pagedRows}
                loading={loading}
                activeTransactionId={activeTransactionId}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={(key) => {
                  if (key === sortKey) {
                    setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
                    return
                  }

                  setSortKey(key)
                  setSortDirection(key === 'date' ? 'desc' : 'asc')
                }}
                onOpen={(transactionId) => void openTransaction(transactionId)}
              />
            </>
          )}
        </div>
      </div>

      {activeTransactionId ? (
        <div style={styles.drawerOverlay}>
          <TransactionDetailDrawer
            detail={detailLoading ? undefined : detail}
            saving={saving}
            ruleSuggestion={ruleSuggestion}
            onUseRuleSuggestion={onUseRuleSuggestion}
            onClose={() => {
              setActiveTransactionId(undefined)
              setDetail(undefined)
              setRuleSuggestion(undefined)
            }}
            onSave={(input) => {
              setSaving(true)
              void window.walnut
                .updateTransaction(input)
                .then(async (result) => {
                  setRuleSuggestion(result.ruleSuggestion)
                  setDetail(result.detail)
                  const nextRows = await window.walnut.listTransactions({
                    ...filters,
                    search: submittedSearch || undefined
                  })
                  startTransition(() => {
                    setRows(nextRows)
                  })
                })
                .finally(() => setSaving(false))
            }}
          />
        </div>
      ) : null}
    </section>
  )
}

const styles = {
  root: {
    width: '100%',
    display: 'grid',
    gap: 'var(--space-lg)'
  },
  headerCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'end',
    gap: 'var(--space-lg)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.72)',
    boxShadow: 'var(--shadow-panel)'
  },
  kicker: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-accent)'
  },
  heading: {
    margin: 'var(--space-sm) 0 0 0',
    fontSize: 'var(--font-display-size)',
    lineHeight: 1.1
  },
  helper: {
    margin: 'var(--space-sm) 0 0 0',
    color: 'var(--color-muted)',
    maxWidth: 720
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    flexWrap: 'wrap' as const
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
  resultMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-md)',
    color: 'var(--color-muted)',
    fontSize: 14
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 'var(--space-md)'
  },
  summaryCard: {
    display: 'grid',
    gap: 'var(--space-xs)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.72)',
    boxShadow: 'var(--shadow-panel)'
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-muted)'
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 700,
    lineHeight: 1.1,
    color: 'var(--color-ink)'
  },
  summaryHelper: {
    fontSize: 13,
    color: 'var(--color-muted)'
  },
  layout: {
    display: 'grid',
    gap: 'var(--space-lg)',
    alignItems: 'start'
  },
  ledgerColumn: {
    minWidth: 0,
    display: 'grid',
    gap: 'var(--space-md)'
  },
  paginationBar: {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(280px, 1fr) auto',
    alignItems: 'center',
    gap: 'var(--space-md)'
  },
  paginationMeta: {
    display: 'flex',
    gap: 'var(--space-md)',
    flexWrap: 'wrap' as const,
    color: 'var(--color-muted)',
    fontSize: 14
  },
  inlineSearchForm: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    justifyContent: 'center'
  },
  inlineSearchWrap: {
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    borderRadius: 999,
    border: '1px solid rgba(15, 118, 110, 0.18)',
    background: 'rgba(255, 255, 255, 0.88)',
    padding: '0 14px',
    width: '100%'
  },
  inlineSearchInput: {
    flex: 1,
    minHeight: 40,
    border: 0,
    outline: 'none',
    background: 'transparent',
    color: 'var(--color-ink)'
  },
  paginationControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
    flexWrap: 'wrap' as const,
    justifyContent: 'flex-end'
  },
  pageSizeWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    color: 'var(--color-muted)',
    fontSize: 14
  },
  pageSizeSelect: {
    minHeight: 40,
    borderRadius: 14,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(255, 255, 255, 0.86)',
    color: 'var(--color-ink)',
    padding: '0 12px'
  },
  pageButtons: {
    display: 'flex',
    gap: 'var(--space-sm)'
  },
  drawerOverlay: {
    position: 'fixed' as const,
    top: 88,
    right: 24,
    bottom: 24,
    width: 420,
    zIndex: 30,
    overflowY: 'auto' as const
  }
} as const
