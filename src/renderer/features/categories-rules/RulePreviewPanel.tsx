import type { RuleApplyPreview } from '../../../shared/contracts/categories'

interface RulePreviewPanelProps {
  preview: RuleApplyPreview
  onClose: () => void
  onApply?: () => void
}

const formatAmount = (minor: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(minor / 100)

export const RulePreviewPanel = ({ preview, onClose, onApply }: RulePreviewPanelProps) => (
  <aside style={styles.panel}>
    <div style={styles.header}>
      <div>
        <div style={styles.kicker}>Preview-first apply</div>
        <h3 style={styles.heading}>Review affected transactions</h3>
      </div>
      <button type="button" style={styles.secondaryButton} onClick={onClose}>
        Close
      </button>
    </div>

    <div style={styles.summaryCard}>
      <strong>{preview.matchCount} matching transactions</strong>
      <span style={styles.helper}>Walnut shows a sample list before applying the rule to existing history.</span>
    </div>

    <div style={styles.sampleList}>
      {preview.samples.map((sample) => (
        <div key={sample.transactionId} style={styles.sampleRow}>
          <div>
            <strong>{sample.description}</strong>
            <div style={styles.helper}>{sample.transactionDateRaw}</div>
          </div>
          <div style={styles.sampleMeta}>
            <span>{formatAmount(sample.signedAmountMinor)}</span>
            <span>{sample.nextCategoryPath?.join(' > ') ?? 'No category change'}</span>
          </div>
        </div>
      ))}
    </div>

    {onApply ? (
      <div style={styles.actions}>
        <button type="button" style={styles.primaryButton} onClick={onApply}>
          Apply to existing transactions
        </button>
      </div>
    ) : null}
  </aside>
)

const styles = {
  panel: {
    position: 'fixed' as const,
    left: 120,
    right: 120,
    bottom: 24,
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.98)',
    boxShadow: 'var(--shadow-panel)',
    zIndex: 35
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
  summaryCard: {
    display: 'grid',
    gap: 'var(--space-xs)',
    padding: 'var(--space-md)',
    borderRadius: 18,
    background: 'rgba(255, 255, 255, 0.56)'
  },
  sampleList: {
    display: 'grid',
    gap: 'var(--space-sm)',
    maxHeight: 260,
    overflowY: 'auto' as const
  },
  sampleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-md)',
    padding: 'var(--space-md)',
    borderRadius: 18,
    background: 'rgba(255, 255, 255, 0.56)',
    border: '1px solid rgba(30, 27, 22, 0.08)'
  },
  sampleMeta: {
    display: 'grid',
    justifyItems: 'end',
    gap: 'var(--space-xs)',
    color: 'var(--color-muted)',
    fontSize: 14
  },
  helper: {
    color: 'var(--color-muted)',
    fontSize: 14
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end'
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
    padding: '0 18px',
    fontWeight: 700
  }
} as const
