import { useEffect, useState } from 'react'
import type { ImportBatchDetail } from '../../../shared/contracts/import'
import { ImportStatusBadge } from './ImportStatusBadge'

interface ImportBatchDetailScreenProps {
  batchId: string
  batchLabel: string
  onBackToHistory: () => void
  onReviewUnresolvedItems: () => void
}

export const ImportBatchDetailScreen = ({
  batchId,
  batchLabel,
  onBackToHistory,
  onReviewUnresolvedItems
}: ImportBatchDetailScreenProps) => {
  const [detail, setDetail] = useState<ImportBatchDetail>()

  useEffect(() => {
    void window.walnut.getImportBatchDetail({ batchId }).then(setDetail)
  }, [batchId])

  if (!detail) {
    return <section style={styles.card}>Loading batch detail…</section>
  }

  return (
    <section style={styles.root}>
      <section style={styles.card}>
        <div style={styles.header}>
          <div>
            <div style={styles.kicker}>Batch receipt view</div>
            <h2 style={styles.heading}>Batch detail</h2>
            <p style={styles.helper}>{batchLabel}</p>
          </div>
          <div style={styles.actions}>
            <button type="button" style={styles.secondaryButton} onClick={onBackToHistory}>
              Back to import history
            </button>
            {detail.summary.unresolvedReviewCount > 0 ? (
              <button type="button" style={styles.primaryButton} onClick={onReviewUnresolvedItems}>
                Review unresolved items
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section style={styles.card}>
        <div style={styles.header}>
          <div>
            <div style={styles.kicker}>Summary strip</div>
            <h3 style={styles.subheading}>Current batch summary</h3>
          </div>
          <ImportStatusBadge status={detail.summary.status} />
        </div>
        <div style={styles.grid}>
          <span>Accepted: {detail.summary.acceptedTransactionCount}</span>
          <span>Blocked duplicates: {detail.summary.blockedDuplicateCount}</span>
          <span>Needs review: {detail.summary.unresolvedReviewCount}</span>
          <span>Last updated: {new Date(detail.summary.lastUpdatedAt).toLocaleString()}</span>
        </div>
      </section>

      <section style={styles.card}>
        <div style={styles.kicker}>Per-file outcomes</div>
        <h3 style={styles.subheading}>Source files</h3>
        <div style={styles.list}>
          {detail.fileOutcomes.map((file) => (
            <div key={`${file.outcome}-${file.id}`} style={styles.fileCard}>
              <div style={styles.fileHeader}>
                <strong>{file.fileName}</strong>
                <span style={styles.fileMeta}>{file.outcome}</span>
              </div>
              {file.reasonBody ? <p style={styles.helper}>{file.reasonBody}</p> : null}
            </div>
          ))}
        </div>
      </section>

      <section style={styles.card}>
        <div style={styles.kicker}>Transaction drill-down</div>
        <h3 style={styles.subheading}>Read-only imported transactions</h3>
        <div style={styles.list}>
          {detail.transactionGroups.length === 0 ? (
            <p style={styles.helper}>No reviewable rows remain for this batch.</p>
          ) : (
            detail.transactionGroups.map((group) => (
              <div key={group.sourceFileId} style={styles.fileCard}>
                <div style={styles.fileHeader}>
                  <strong>{group.sourceFileName}</strong>
                  <span style={styles.fileMeta}>{group.transactions.length} transactions</span>
                </div>
                <div style={styles.list}>
                  {group.transactions.map((transaction) => (
                    <div key={transaction.id} style={styles.transactionRow}>
                      <span>{transaction.cleanedDescription}</span>
                      <span>{transaction.transactionDateRaw}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-md)',
    alignItems: 'center'
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
  subheading: {
    margin: 'var(--space-sm) 0 0 0',
    fontSize: 'var(--font-heading-size)',
    lineHeight: 1.2
  },
  helper: {
    margin: 0,
    color: 'var(--color-muted)'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 'var(--space-sm)'
  },
  list: {
    display: 'grid',
    gap: 'var(--space-md)'
  },
  fileCard: {
    display: 'grid',
    gap: 'var(--space-sm)',
    padding: 'var(--space-md)',
    borderRadius: 'var(--radius-md)',
    background: 'rgba(226, 215, 197, 0.72)',
    border: '1px solid rgba(30, 27, 22, 0.08)'
  },
  fileHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-sm)',
    alignItems: 'center'
  },
  fileMeta: {
    textTransform: 'capitalize',
    color: 'var(--color-muted)',
    fontSize: 14
  },
  transactionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-sm)',
    padding: 'var(--space-sm) 0',
    borderBottom: '1px solid rgba(30, 27, 22, 0.08)'
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
