import {
  ArrowUpRight,
  ChevronRight,
  Clock3,
  CreditCard,
  Landmark,
  RefreshCcw,
  Sparkles,
  Upload,
  Wallet
} from 'lucide-react'
import { startTransition, useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import type { DashboardPreferences, DashboardRecurringDetail, DashboardSnapshot, DashboardSnapshotQuery } from '../../../shared/contracts/dashboard'
import type { TransactionLedgerQuery } from '../../../shared/contracts/transactions'

interface DashboardScreenProps {
  onImport: () => void
  onOpenLedger: (query: TransactionLedgerQuery) => void
}

const presetOptions = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
  { id: 'all-time', label: 'All time' },
  { id: 'custom', label: 'Custom' }
] as const

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2
})

const compactCurrencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1
})

const summaryIcons = {
  credited: <Landmark size={18} />,
  debited: <Wallet size={18} />,
  difference: <RefreshCcw size={18} />,
  income: <ArrowUpRight size={18} />,
  expense: <CreditCard size={18} />
} as const

const operationTint = {
  transfer: 'rgba(15, 118, 110, 0.1)',
  refund: 'rgba(91, 140, 120, 0.12)',
  'atm-withdrawal': 'rgba(30, 27, 22, 0.08)',
  'credit-card-payment': 'rgba(226, 148, 58, 0.12)'
} as const

const formatAmount = (minor: number) => currencyFormatter.format(minor / 100)
const formatCompactAmount = (minor: number) => compactCurrencyFormatter.format(minor / 100)
const snapshotHasData = (snapshot?: DashboardSnapshot) =>
  Boolean(snapshot) &&
  (snapshot.summaryCards.some((card) => card.totalMinor !== 0) || snapshot.recentTransactions.length > 0 || snapshot.spendTrend.length > 0)

export const DashboardScreen = ({ onImport, onOpenLedger }: DashboardScreenProps) => {
  const supportsDashboardApi =
    typeof window.walnut.getDashboardPreferences === 'function' &&
    typeof window.walnut.getDashboardSnapshot === 'function' &&
    typeof window.walnut.getRecurringDetail === 'function'
  const [viewportWidth, setViewportWidth] = useState(typeof window === 'undefined' ? 1440 : window.innerWidth)
  const [preferences, setPreferences] = useState<DashboardPreferences>()
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>()
  const [loading, setLoading] = useState(true)
  const [compareEnabled, setCompareEnabled] = useState(true)
  const [recurringDetail, setRecurringDetail] = useState<DashboardRecurringDetail>()
  const [recurringLoading, setRecurringLoading] = useState(false)
  const [merchantCount, setMerchantCount] = useState(5)

  useEffect(() => {
    if (!supportsDashboardApi) {
      setLoading(false)
      return
    }
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const nextPreferences = await window.walnut.getDashboardPreferences()
        if (cancelled) {
          return
        }
        setPreferences(nextPreferences)
        setCompareEnabled(nextPreferences.compareEnabled)
        const nextSnapshot = await window.walnut.getDashboardSnapshot({
          range: nextPreferences.range,
          compare: { enabled: nextPreferences.compareEnabled }
        })
        const resolvedSnapshot =
          !snapshotHasData(nextSnapshot) && nextPreferences.range.preset !== 'all-time'
            ? await window.walnut.getDashboardSnapshot({
                range: { preset: 'all-time' },
                compare: { enabled: nextPreferences.compareEnabled }
              })
            : nextSnapshot
        if (!cancelled) {
          const resolvedPreferences = {
            range: resolvedSnapshot.query.range,
            compareEnabled: Boolean(resolvedSnapshot.query.compare?.enabled)
          }
          setPreferences(resolvedPreferences)
          setCompareEnabled(resolvedPreferences.compareEnabled)
          if (resolvedPreferences.range.preset !== nextPreferences.range.preset) {
            await window.walnut.setDashboardPreferences(resolvedPreferences)
          }
          startTransition(() => setSnapshot(resolvedSnapshot))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [supportsDashboardApi])

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!supportsDashboardApi) {
    return <section style={styles.loadingCard}>Dashboard analytics are not available in this build.</section>
  }

  const compactMode = viewportWidth < 1360
  const condensedMode = viewportWidth < 1100

  const refreshSnapshot = async (query: DashboardSnapshotQuery, persist = true) => {
    setLoading(true)
    try {
      const nextSnapshot = await window.walnut.getDashboardSnapshot(query)
      startTransition(() => setSnapshot(nextSnapshot))
      if (persist) {
        const nextPreferences = {
          range: nextSnapshot.query.range,
          compareEnabled: Boolean(nextSnapshot.query.compare?.enabled)
        }
        setPreferences(nextPreferences)
        setCompareEnabled(nextPreferences.compareEnabled)
        await window.walnut.setDashboardPreferences(nextPreferences)
      }
    } finally {
      setLoading(false)
    }
  }

  const updateRange = async (nextRange: DashboardPreferences['range']) => {
    await refreshSnapshot({
      range: nextRange,
      compare: { enabled: compareEnabled }
    })
  }

  const updateCompare = async (enabled: boolean) => {
    setCompareEnabled(enabled)
    const currentRange = preferences?.range ?? snapshot?.query.range
    if (!currentRange) {
      return
    }
    await refreshSnapshot({
      range: currentRange,
      compare: { enabled }
    })
  }

  const hasData = useMemo(() => snapshotHasData(snapshot), [snapshot])

  const loadRecurringDetail = async (recurringId: string) => {
    if (!snapshot) {
      return
    }

    setRecurringLoading(true)
    try {
      const detail = await window.walnut.getRecurringDetail({
        recurringId,
        query: {
          range: snapshot.query.range,
          compare: snapshot.query.compare
        }
      })
      setRecurringDetail(detail)
    } finally {
      setRecurringLoading(false)
    }
  }

  if (!preferences || !snapshot) {
    return <section style={styles.loadingCard}>Loading dashboard analytics…</section>
  }

  const isEmptyState = !hasData
  const trendData = snapshot.spendTrend.map((point) => ({
    label: point.bucketLabel,
    spend: Number((point.spendMinor / 100).toFixed(2)),
    income: Number((point.incomeMinor / 100).toFixed(2)),
    previousSpend: Number(((point.previousSpendMinor ?? 0) / 100).toFixed(2)),
    previousIncome: Number(((point.previousIncomeMinor ?? 0) / 100).toFixed(2)),
    ledgerQuery: point.ledgerQuery
  }))

  return (
    <section style={styles.root}>
      <section
        style={{
          ...styles.hero,
          gridTemplateColumns: condensedMode ? '1fr' : compactMode ? 'minmax(0, 1fr)' : 'minmax(0, 1.15fr) minmax(340px, 0.85fr)'
        }}
      >
        <div style={styles.heroIntro}>
          <div style={styles.kicker}>Dashboard analytics</div>
          <h2 style={styles.heroHeading}>
            {isEmptyState ? 'Import statements to light up your finance dashboard.' : 'See how this household earns, spends, and repeats over time.'}
          </h2>
          <p style={styles.heroBody}>
            {isEmptyState
              ? 'The dashboard widgets are ready now. Bring in one or more ICICI statements to populate trends, categories, merchants, and recurring activity without storing the source files.'
              : 'Walnut keeps the full view local, fast, and connected to the transaction ledger whenever you want to drill into a pattern.'}
          </p>
          {isEmptyState ? (
            <div style={styles.heroActionRow}>
              <button type="button" aria-label="Import statements from dashboard" style={styles.primaryButton} onClick={onImport}>
                <Upload size={16} />
                Import statements
              </button>
              <div style={styles.inlineNote}>
                <Sparkles size={16} />
                <span>Widgets will start filling in as soon as your first batch is imported.</span>
              </div>
            </div>
          ) : null}
        </div>

        <div style={styles.controlPanel}>
          <div style={styles.controlGroup}>
            <span style={styles.controlLabel}>Time range</span>
            <div style={styles.chipRow}>
              {presetOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  style={{
                    ...styles.chip,
                    ...(preferences.range.preset === option.id ? styles.chipActive : undefined)
                  }}
                  onClick={() => void updateRange({ preset: option.id })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.controlRow}>
            <label style={styles.toggleWrap}>
              <input
                type="checkbox"
                checked={compareEnabled}
                onChange={(event) => void updateCompare(event.target.checked)}
              />
              <span>Compare with previous period</span>
            </label>

            {preferences.range.preset === 'custom' ? (
              <div style={styles.customRangeRow}>
                <input
                  aria-label="Custom range from"
                  type="date"
                  value={preferences.range.from ?? ''}
                  onChange={(event) => {
                    const nextFrom = event.target.value
                    void updateRange({
                      preset: 'custom',
                      from: nextFrom,
                      to: preferences.range.to ?? nextFrom
                    })
                  }}
                  style={styles.dateInput}
                />
                <input
                  aria-label="Custom range to"
                  type="date"
                  value={preferences.range.to ?? ''}
                  onChange={(event) => {
                    const nextTo = event.target.value
                    void updateRange({
                      preset: 'custom',
                      from: preferences.range.from ?? nextTo,
                      to: nextTo
                    })
                  }}
                  style={styles.dateInput}
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section style={styles.summaryGrid}>
        {snapshot.summaryCards.map((card) => (
          <article key={card.id} style={styles.summaryCard}>
            <div style={styles.summaryMeta}>
              <div style={styles.summaryIcon}>{summaryIcons[card.id]}</div>
              <div>
                <div style={styles.summaryLabel}>{card.label}</div>
                <div style={styles.summaryHelper}>{card.helper}</div>
              </div>
            </div>
            <div style={styles.summaryValue}>{formatAmount(card.totalMinor)}</div>
            <div style={styles.summaryDeltaRow}>
              <span
                style={{
                  ...styles.deltaPill,
                  ...(card.trend === 'up' ? styles.deltaUp : card.trend === 'down' ? styles.deltaDown : styles.deltaFlat)
                }}
              >
                {card.deltaMinor === undefined ? 'No comparison' : `${card.deltaMinor >= 0 ? '+' : ''}${formatCompactAmount(card.deltaMinor)}`}
              </span>
              {card.previousTotalMinor !== undefined ? <span style={styles.previousValue}>Prev: {formatCompactAmount(card.previousTotalMinor)}</span> : null}
            </div>
          </article>
        ))}
      </section>

      <section style={styles.operationalRow}>
        {snapshot.operationalCards.map((card) => (
          <article key={card.id} style={{ ...styles.operationalCard, background: operationTint[card.id] }}>
            <div style={styles.operationalLabel}>{card.label}</div>
            <div style={styles.operationalValue}>{formatCompactAmount(card.totalMinor)}</div>
            <div style={styles.operationalHelper}>{card.transactionCount} transactions in range</div>
          </article>
        ))}
      </section>

      <section
        style={{
          ...styles.analyticsGrid,
          gridTemplateColumns: compactMode ? '1fr' : 'minmax(0, 1.3fr) minmax(320px, 0.9fr)'
        }}
      >
        <article style={{ ...styles.panel, ...(compactMode ? undefined : styles.spanWide) }}>
          <div style={styles.panelHeader}>
            <div>
              <div style={styles.panelEyebrow}>Spend trend</div>
              <h3 style={styles.panelTitle}>Income vs spend over time</h3>
            </div>
          </div>
          <div style={styles.chartWrap}>
            {trendData.length === 0 ? (
              <div style={styles.emptyPanel}>Import transactions to see weekly, monthly, or yearly income-versus-spend trends here.</div>
            ) : (
              <ResponsiveContainer width="100%" height={290}>
                <AreaChart data={trendData}>
                  <CartesianGrid stroke="rgba(30, 27, 22, 0.08)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#6d6557', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#6d6557', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value: number, name: string) => [currencyFormatter.format(value), name === 'spend' ? 'Spend' : name === 'income' ? 'Income' : name]}
                    contentStyle={styles.tooltip}
                  />
                  {compareEnabled ? <Area type="monotone" dataKey="previousSpend" stroke="rgba(30,27,22,0.18)" fill="rgba(30,27,22,0.06)" /> : null}
                  <Area type="monotone" dataKey="spend" stroke="#0f766e" fill="rgba(15,118,110,0.22)" activeDot={{ r: 5 }} onClick={(data) => data?.payload?.ledgerQuery && onOpenLedger(data.payload.ledgerQuery)} />
                  <Area type="monotone" dataKey="income" stroke="#b0781d" fill="rgba(176,120,29,0.18)" activeDot={{ r: 5 }} onClick={(data) => data?.payload?.ledgerQuery && onOpenLedger(data.payload.ledgerQuery)} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <div style={styles.panelEyebrow}>Category breakdown</div>
              <h3 style={styles.panelTitle}>Where the spend is concentrated</h3>
            </div>
          </div>
          <div style={styles.chartWrapSmall}>
            {snapshot.categoryBreakdown.length === 0 ? (
              <div style={styles.emptyPanel}>Categories will show up here after Walnut classifies imported transactions.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={snapshot.categoryBreakdown.map((item) => ({ ...item, total: Number((item.totalMinor / 100).toFixed(2)) }))} layout="vertical">
                  <CartesianGrid stroke="rgba(30, 27, 22, 0.08)" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="label" type="category" tick={{ fill: '#6d6557', fontSize: 12 }} tickLine={false} axisLine={false} width={120} />
                  <Tooltip formatter={(value: number) => currencyFormatter.format(value)} contentStyle={styles.tooltip} />
                  <Bar dataKey="total" radius={[0, 12, 12, 0]} onClick={(data) => data?.payload?.ledgerQuery && onOpenLedger(data.payload.ledgerQuery)}>
                    {snapshot.categoryBreakdown.map((item, index) => (
                      <Cell key={item.label} fill={index % 2 === 0 ? '#0f766e' : '#79a79f'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <div style={styles.panelEyebrow}>Top merchants</div>
              <h3 style={styles.panelTitle}>High-frequency spend anchors</h3>
            </div>
            <label style={styles.merchantControl}>
              <span>Show</span>
              <select value={merchantCount} onChange={(event) => setMerchantCount(Number(event.target.value))} style={styles.inlineSelect}>
                {[5, 8].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div style={styles.listStack}>
            {snapshot.topMerchants.length === 0 ? (
              <div style={styles.emptyPanel}>Top merchants will appear here once spend starts coming into the current range.</div>
            ) : (
              snapshot.topMerchants.slice(0, merchantCount).map((item, index) => (
                <button key={item.merchant} type="button" style={styles.listRowButton} onClick={() => item.ledgerQuery && onOpenLedger(item.ledgerQuery)}>
                  <div style={styles.listRank}>{index + 1}</div>
                  <div style={styles.listCopy}>
                    <div style={styles.listTitle}>{item.merchant}</div>
                    <div style={styles.listMeta}>{item.transactionCount} transactions</div>
                  </div>
                  <div style={styles.listAmount}>{formatAmount(item.totalMinor)}</div>
                </button>
              ))
            )}
          </div>
        </article>

        <article style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <div style={styles.panelEyebrow}>Recurring items</div>
              <h3 style={styles.panelTitle}>Patterns that keep showing up</h3>
            </div>
          </div>
          <div style={styles.listStack}>
            {snapshot.recurringItems.length === 0 ? (
              <div style={styles.emptyPanel}>No recurring patterns detected in this range yet.</div>
            ) : (
              snapshot.recurringItems.map((item) => (
                <button key={item.id} type="button" style={styles.listRowButton} onClick={() => void loadRecurringDetail(item.id)}>
                  <div style={styles.listIcon}><Clock3 size={16} /></div>
                  <div style={styles.listCopy}>
                    <div style={styles.listTitle}>{item.description}</div>
                    <div style={styles.listMeta}>{item.cadenceLabel}</div>
                  </div>
                  <div style={styles.listChevron}>
                    <ChevronRight size={16} />
                  </div>
                </button>
              ))
            )}
          </div>
        </article>

        <article style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <div style={styles.panelEyebrow}>Largest transactions</div>
              <h3 style={styles.panelTitle}>Biggest values in this view</h3>
            </div>
          </div>
          <div style={styles.listStack}>
            {snapshot.largestTransactions.length === 0 ? (
              <div style={styles.emptyPanel}>Largest transactions will populate after imported records land in this date range.</div>
            ) : (
              snapshot.largestTransactions.map((item) => (
                <button key={item.transactionId} type="button" style={styles.listRowButton} onClick={() => item.ledgerQuery && onOpenLedger(item.ledgerQuery)}>
                  <div style={styles.listCopy}>
                    <div style={styles.listTitle}>{item.description}</div>
                    <div style={styles.listMeta}>{item.transactionDateRaw}</div>
                  </div>
                  <div style={styles.listAmount}>{formatAmount(item.amountMinor)}</div>
                </button>
              ))
            )}
          </div>
        </article>

        <article style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <div style={styles.panelEyebrow}>Recent transactions</div>
              <h3 style={styles.panelTitle}>Latest movement preview</h3>
            </div>
          </div>
          <div style={styles.listStack}>
            {snapshot.recentTransactions.length === 0 ? (
              <div style={styles.emptyPanel}>Recent activity previews will appear here after your first imported batch.</div>
            ) : (
              snapshot.recentTransactions.map((item) => (
                <button key={item.transactionId} type="button" style={styles.listRowButton} onClick={() => item.ledgerQuery && onOpenLedger(item.ledgerQuery)}>
                  <div style={styles.listCopy}>
                    <div style={styles.listTitle}>{item.description}</div>
                    <div style={styles.listMeta}>{item.transactionDateRaw}</div>
                  </div>
                  <div style={{ ...styles.listAmount, color: item.signedAmountMinor >= 0 ? 'var(--color-accent)' : 'var(--color-ink)' }}>
                    {formatAmount(item.signedAmountMinor)}
                  </div>
                </button>
              ))
            )}
          </div>
        </article>
      </section>

      {recurringDetail ? (
        <div style={styles.recurringOverlay}>
          <aside
            style={{
              ...styles.recurringPanel,
              width: compactMode ? 'min(100vw - 32px, 520px)' : undefined
            }}
          >
            <div style={styles.panelHeader}>
              <div>
                <div style={styles.panelEyebrow}>Recurring detail</div>
                <h3 style={styles.panelTitle}>{recurringDetail.item.description}</h3>
              </div>
              <button type="button" style={styles.closeButton} onClick={() => setRecurringDetail(undefined)}>
                Close
              </button>
            </div>
            <div style={styles.recurringMeta}>
              <span>{recurringDetail.item.cadenceLabel}</span>
              <span>{formatAmount(recurringDetail.item.averageAmountMinor)} average</span>
            </div>
            <div style={styles.listStack}>
              {recurringLoading ? (
                <div style={styles.emptyPanel}>Loading recurring detail…</div>
              ) : (
                recurringDetail.transactions.map((transaction) => (
                  <button
                    key={transaction.transactionId}
                    type="button"
                    style={styles.listRowButton}
                    onClick={() => recurringDetail.item.ledgerQuery && onOpenLedger(recurringDetail.item.ledgerQuery)}
                  >
                    <div style={styles.listCopy}>
                      <div style={styles.listTitle}>{transaction.description}</div>
                      <div style={styles.listMeta}>{transaction.transactionDateRaw}</div>
                    </div>
                    <div style={styles.listAmount}>{formatAmount(transaction.signedAmountMinor)}</div>
                  </button>
                ))
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  )
}

const panelBase = {
  borderRadius: 'var(--radius-xl)',
  border: '1px solid var(--color-border)',
  background: 'rgba(245, 241, 232, 0.74)',
  boxShadow: 'var(--shadow-panel)'
}

const styles = {
  root: {
    width: '100%',
    display: 'grid',
    gap: 'var(--space-lg)'
  },
  loadingCard: {
    ...panelBase,
    padding: 'var(--space-xl)'
  },
  hero: {
    ...panelBase,
    padding: 'var(--space-xl)',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.15fr) minmax(340px, 0.85fr)',
    gap: 'var(--space-xl)',
    alignItems: 'start'
  },
  heroIntro: {
    display: 'grid',
    gap: 'var(--space-md)'
  },
  kicker: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--color-accent)'
  },
  heroHeading: {
    margin: 0,
    fontSize: 'clamp(2rem, 4vw, 3.5rem)',
    lineHeight: 0.96
  },
  heroBody: {
    margin: 0,
    maxWidth: 700,
    fontSize: 17,
    lineHeight: 1.55,
    color: 'var(--color-muted)'
  },
  heroActionRow: {
    display: 'grid',
    gap: 'var(--space-md)',
    justifyItems: 'start'
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 999,
    border: 0,
    background: 'var(--color-accent)',
    color: '#fff',
    padding: '0 22px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    fontWeight: 700,
    fontSize: 17
  },
  inlineNote: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    color: 'var(--color-muted)',
    fontWeight: 600,
    lineHeight: 1.5
  },
  controlPanel: {
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    background: 'rgba(255, 255, 255, 0.72)',
    border: '1px solid rgba(15, 118, 110, 0.12)'
  },
  controlGroup: {
    display: 'grid',
    gap: 'var(--space-sm)'
  },
  controlLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--color-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em'
  },
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 'var(--space-sm)'
  },
  chip: {
    minHeight: 38,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.12)',
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-ink)',
    padding: '0 14px',
    fontWeight: 600
  },
  chipActive: {
    background: 'rgba(15, 118, 110, 0.14)',
    color: 'var(--color-accent)',
    border: '1px solid rgba(15, 118, 110, 0.24)'
  },
  controlRow: {
    display: 'grid',
    gap: 'var(--space-md)'
  },
  toggleWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    color: 'var(--color-ink)',
    fontWeight: 600
  },
  customRangeRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 'var(--space-sm)'
  },
  dateInput: {
    minHeight: 42,
    borderRadius: 14,
    border: '1px solid rgba(15, 118, 110, 0.18)',
    background: '#fff',
    padding: '0 14px',
    color: 'var(--color-ink)'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 'var(--space-md)'
  },
  summaryCard: {
    ...panelBase,
    padding: 'var(--space-lg)',
    display: 'grid',
    gap: 'var(--space-md)'
  },
  summaryMeta: {
    display: 'flex',
    gap: 'var(--space-sm)',
    alignItems: 'start'
  },
  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(15, 118, 110, 0.1)',
    color: 'var(--color-accent)'
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: 700
  },
  summaryHelper: {
    marginTop: 4,
    fontSize: 12,
    color: 'var(--color-muted)',
    lineHeight: 1.45
  },
  summaryValue: {
    fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
    fontWeight: 700,
    lineHeight: 1.05
  },
  summaryDeltaRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 'var(--space-sm)',
    alignItems: 'center'
  },
  deltaPill: {
    minHeight: 28,
    borderRadius: 999,
    padding: '0 10px',
    display: 'inline-flex',
    alignItems: 'center',
    fontWeight: 700,
    fontSize: 12
  },
  deltaUp: {
    background: 'rgba(15, 118, 110, 0.12)',
    color: 'var(--color-accent)'
  },
  deltaDown: {
    background: 'rgba(165, 58, 58, 0.12)',
    color: '#a53a3a'
  },
  deltaFlat: {
    background: 'rgba(30, 27, 22, 0.08)',
    color: 'var(--color-muted)'
  },
  previousValue: {
    fontSize: 12,
    color: 'var(--color-muted)'
  },
  operationalRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 'var(--space-md)'
  },
  operationalCard: {
    ...panelBase,
    padding: 'var(--space-md)',
    display: 'grid',
    gap: 'var(--space-xs)'
  },
  operationalLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--color-muted)'
  },
  operationalValue: {
    fontSize: 24,
    fontWeight: 700
  },
  operationalHelper: {
    fontSize: 12,
    color: 'var(--color-muted)'
  },
  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.3fr) minmax(320px, 0.9fr)',
    gap: 'var(--space-lg)'
  },
  panel: {
    ...panelBase,
    padding: 'var(--space-lg)',
    display: 'grid',
    gap: 'var(--space-md)',
    minWidth: 0
  },
  spanWide: {
    gridRow: 'span 2'
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-md)',
    alignItems: 'start'
  },
  panelEyebrow: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--color-accent)'
  },
  panelTitle: {
    margin: 'var(--space-xs) 0 0 0',
    fontSize: 24,
    lineHeight: 1.1
  },
  chartWrap: {
    height: 290
  },
  chartWrapSmall: {
    height: 260
  },
  tooltip: {
    borderRadius: 16,
    border: '1px solid rgba(30, 27, 22, 0.08)',
    boxShadow: '0 24px 48px rgba(30, 27, 22, 0.12)',
    background: 'rgba(255, 251, 244, 0.94)'
  },
  merchantControl: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    fontSize: 13,
    color: 'var(--color-muted)'
  },
  inlineSelect: {
    minHeight: 34,
    borderRadius: 12,
    border: '1px solid rgba(30, 27, 22, 0.12)',
    background: 'rgba(255,255,255,0.82)',
    padding: '0 10px'
  },
  listStack: {
    display: 'grid',
    gap: 'var(--space-sm)'
  },
  listRowButton: {
    width: '100%',
    border: '1px solid rgba(30, 27, 22, 0.08)',
    background: 'rgba(255,255,255,0.68)',
    borderRadius: 18,
    padding: 'var(--space-md)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
    textAlign: 'left' as const
  },
  listRank: {
    width: 32,
    height: 32,
    borderRadius: 12,
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(15, 118, 110, 0.08)',
    color: 'var(--color-accent)',
    fontWeight: 700,
    flexShrink: 0
  },
  listIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(15, 118, 110, 0.1)',
    color: 'var(--color-accent)',
    flexShrink: 0
  },
  listCopy: {
    minWidth: 0,
    flex: 1
  },
  listTitle: {
    fontWeight: 700,
    color: 'var(--color-ink)'
  },
  listMeta: {
    marginTop: 4,
    fontSize: 13,
    color: 'var(--color-muted)'
  },
  listAmount: {
    fontWeight: 700,
    color: 'var(--color-ink)',
    whiteSpace: 'nowrap' as const
  },
  listChevron: {
    color: 'var(--color-muted)'
  },
  emptyPanel: {
    minHeight: 120,
    borderRadius: 18,
    border: '1px dashed rgba(30, 27, 22, 0.18)',
    display: 'grid',
    placeItems: 'center',
    color: 'var(--color-muted)',
    textAlign: 'center' as const,
    padding: 'var(--space-lg)'
  },
  recurringOverlay: {
    position: 'fixed' as const,
    top: 96,
    right: 24,
    bottom: 24,
    width: 420,
    zIndex: 35
  },
  recurringPanel: {
    ...panelBase,
    height: '100%',
    padding: 'var(--space-lg)',
    display: 'grid',
    gridTemplateRows: 'auto auto 1fr',
    gap: 'var(--space-md)',
    overflow: 'auto' as const
  },
  closeButton: {
    minHeight: 40,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(30, 27, 22, 0.04)',
    padding: '0 16px',
    fontWeight: 600
  },
  recurringMeta: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 'var(--space-sm)',
    color: 'var(--color-muted)',
    fontSize: 13
  }
} as const
