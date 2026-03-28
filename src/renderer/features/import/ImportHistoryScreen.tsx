import { useEffect, useState } from 'react'
import type { ImportAttemptSummary } from '../../../shared/contracts/import'
import { ImportStatusBadge } from './ImportStatusBadge'

interface ImportHistoryScreenProps {
  onBackToWorkspace: () => void
  onOpenBatchDetail: (batchId: string, batchLabel: string) => void
  onOpenReviewQueue: (batchId: string, batchLabel: string) => void
}

export const ImportHistoryScreen = ({
  onBackToWorkspace,
  onOpenBatchDetail,
  onOpenReviewQueue
}: ImportHistoryScreenProps) => {
  const [history, setHistory] = useState<ImportAttemptSummary[]>([])
  const [loading, setLoading] = useState(true)

  const loadHistory = async () => {
    setLoading(true)
    try {
      setHistory(await window.walnut.listImportHistory())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadHistory()
  }, [])

  return (
    <section style={styles.root}>
      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <div style={styles.kicker}>Operational ledger</div>
            <h2 style={styles.heading}>Import history</h2>
            <p style={styles.helper}>Every import attempt stays visible here, including imported, needs-review, rejected, and failed outcomes.</p>
          </div>
          <div style={styles.actions}>
            <button type="button" style={styles.secondaryButton} onClick={() => void loadHistory()}>
              Refresh history
            </button>
            <button type="button" style={styles.secondaryButton} onClick={onBackToWorkspace}>
              Back to import workspace
            </button>
          </div>
        </div>
      </section>

      {loading ? <section style={styles.card}>Loading history…</section> : null}

      {!loading && history.length === 0 ? (
        <section style={styles.emptyState}>
          <div style={styles.kicker}>Import history</div>
          <h3 style={styles.emptyHeading}>No imports yet</h3>
          <p style={styles.helper}>Import an ICICI statement to create your first batch history entry and review trail.</p>
        </section>
      ) : null}

      {!loading
        ? history.map((attempt) => (
            <section key={attempt.attemptId} style={styles.rowCard}>
              <div style={styles.rowHeader}>
                <div>
                  <div style={styles.rowMeta}>{new Date(attempt.importedAt).toLocaleString()}</div>
                  <h3 style={styles.rowHeading}>{attempt.batchLabel}</h3>
                  <div style={styles.rowMeta}>{attempt.accountLabel ?? 'ICICI account'}</div>
                </div>
                <ImportStatusBadge status={attempt.status} />
              </div>
              <div style={styles.countGrid}>
                <span>Files: {attempt.fileCount}</span>
                <span>Accepted: {attempt.acceptedTransactionCount}</span>
                <span>Blocked duplicates: {attempt.blockedDuplicateCount}</span>
                <span>Needs review: {attempt.unresolvedReviewCount}</span>
              </div>
              <div style={styles.actions}>
                <button
                  type="button"
                  aria-label={`Open batch detail for ${attempt.batchLabel}`}
                  style={styles.primaryButton}
                  onClick={() => onOpenBatchDetail(attempt.batchId, attempt.batchLabel)}
                >
                  Open batch detail
                </button>
                {attempt.unresolvedReviewCount > 0 ? (
                  <button
                    type="button"
                    aria-label={`Open review queue for ${attempt.batchLabel}`}
                    style={styles.secondaryButton}
                    onClick={() => onOpenReviewQueue(attempt.batchId, attempt.batchLabel)}
                  >
                    Open review queue
                  </button>
                ) : null}
              </div>
            </section>
          ))
        : null}
    </section>
  )
}

const styles = {
  root: {
    width: 'min(100%, 1180px)',
    display: 'grid',
    gap: 'var(--space-lg)'
  },
  card: {
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.72)',
    boxShadow: 'var(--shadow-panel)'
  },
  emptyState: {
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-2xl)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.72)',
    boxShadow: 'var(--shadow-panel)'
  },
  rowCard: {
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.72)',
    boxShadow: 'var(--shadow-panel)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-md)',
    alignItems: 'center'
  },
  rowHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-md)',
    alignItems: 'start'
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
  emptyHeading: {
    margin: 'var(--space-sm) 0 0 0',
    fontSize: 'var(--font-heading-size)',
    lineHeight: 1.2
  },
  rowHeading: {
    margin: 'var(--space-xs) 0',
    fontSize: 'var(--font-heading-size)',
    lineHeight: 1.2
  },
  helper: {
    margin: 0,
    color: 'var(--color-muted)',
    maxWidth: 720
  },
  rowMeta: {
    color: 'var(--color-muted)',
    fontSize: 14
  },
  countGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 'var(--space-sm)',
    color: 'var(--color-ink)'
  },
  actions: {
    display: 'flex',
    gap: 'var(--space-sm)',
    flexWrap: 'wrap'
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-ink)',
    padding: '0 18px',
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
  }
}
