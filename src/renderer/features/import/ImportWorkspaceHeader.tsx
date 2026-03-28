import { CheckCircle2, ShieldCheck, Upload } from 'lucide-react'

interface ImportWorkspaceHeaderProps {
  processedCount: number
  totalCount: number
  busyLabel?: string
  onImportClick: () => void
}

export const ImportWorkspaceHeader = ({ processedCount, totalCount, busyLabel, onImportClick }: ImportWorkspaceHeaderProps) => {
  const progressLabel = totalCount > 0 ? `${processedCount} of ${totalCount} files processed` : 'No files staged yet'
  const readinessLabel =
    totalCount > 0
      ? 'Review the staged results, resolve anything unclear, then import only the files that feel ready.'
      : 'Start with one or more ICICI statement exports to build a clean import batch.'

  return (
    <section style={styles.root}>
      <div style={styles.heroCard}>
        <div style={styles.heroCopy}>
          <div style={styles.kicker}>Statement import pipeline</div>
          <h2 style={styles.heading}>Import statements</h2>
          <p style={styles.body}>
            Stage one or more ICICI statements, review any issues, and import the records without storing the source files.
          </p>
          <div style={styles.privacyLine}>
            <ShieldCheck size={16} strokeWidth={2} />
            Statement files are read for import and are not stored by Walnut.
          </div>
        </div>

        <div style={styles.statusPanel}>
          <div style={styles.statusHeader}>
            <div style={styles.progressLabel}>Workspace status</div>
            <div style={styles.progressValue}>{progressLabel}</div>
          </div>
          <p style={styles.progressBody}>{readinessLabel}</p>

          <div style={styles.stepRow}>
            <div style={styles.stepChip}>
              <span style={styles.stepIndex}>1</span>
              <span>Stage files</span>
            </div>
            <div style={styles.stepChip}>
              <span style={styles.stepIndex}>2</span>
              <span>Review issues</span>
            </div>
            <div style={styles.stepChip}>
              <span style={styles.stepIndex}>3</span>
              <span>Import cleanly</span>
            </div>
          </div>

          <div style={styles.actionRow}>
            <button type="button" aria-label="Import statements from workspace" style={styles.primaryButton} onClick={onImportClick}>
              <Upload size={18} strokeWidth={2.2} />
              {busyLabel ?? 'Stage more statements'}
            </button>

            {totalCount > 0 ? (
              <div style={styles.progressBadge}>
                <CheckCircle2 size={16} strokeWidth={2.2} />
                Batch stays local until you commit it
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

const styles = {
  root: {
    display: 'grid'
  },
  heroCard: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.2fr) minmax(360px, 0.9fr)',
    gap: 'var(--space-lg)',
    padding: 'var(--space-xl)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.7)',
    boxShadow: 'var(--shadow-panel)'
  },
  heroCopy: {
    display: 'grid',
    gap: 'var(--space-md)',
    alignContent: 'start'
  },
  kicker: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-accent)'
  },
  heading: {
    margin: 0,
    fontSize: 'var(--font-display-size)',
    lineHeight: 1.05
  },
  body: {
    margin: 0,
    color: 'var(--color-muted)',
    maxWidth: 640,
    fontSize: 18,
    lineHeight: 1.45
  },
  privacyLine: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    color: 'var(--color-muted)',
    fontSize: 14,
    fontWeight: 600
  },
  statusPanel: {
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(15, 118, 110, 0.14)',
    background: 'linear-gradient(180deg, rgba(15, 118, 110, 0.12), rgba(255, 255, 255, 0.62))'
  },
  statusHeader: {
    display: 'grid',
    gap: 'var(--space-xs)'
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--color-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em'
  },
  progressValue: {
    fontSize: 30,
    lineHeight: 1.15,
    fontWeight: 800,
    color: 'var(--color-ink)'
  },
  progressBody: {
    margin: 0,
    color: 'var(--color-muted)',
    lineHeight: 1.45
  },
  stepRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 'var(--space-sm)'
  },
  stepChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    minHeight: 38,
    padding: '0 14px',
    borderRadius: 999,
    background: 'rgba(255, 255, 255, 0.72)',
    border: '1px solid rgba(30, 27, 22, 0.08)',
    color: 'var(--color-ink)',
    fontWeight: 600
  },
  stepIndex: {
    width: 22,
    height: 22,
    borderRadius: 999,
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(15, 118, 110, 0.12)',
    color: 'var(--color-accent)',
    fontSize: 12,
    fontWeight: 800
  },
  actionRow: {
    display: 'grid',
    gap: 'var(--space-sm)',
    justifyItems: 'start' as const
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-sm)',
    minHeight: 54,
    border: 0,
    borderRadius: 999,
    background: 'var(--color-accent)',
    color: '#fff',
    padding: '0 24px',
    fontWeight: 700,
    minWidth: 240
  },
  progressBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    minHeight: 36,
    padding: '0 14px',
    borderRadius: 999,
    background: 'rgba(255, 255, 255, 0.72)',
    color: 'var(--color-muted)',
    fontSize: 13,
    fontWeight: 600
  }
} as const
