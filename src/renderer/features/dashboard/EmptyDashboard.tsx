import { ArrowUpRight, BarChart3, Landmark, Sparkles, Upload } from 'lucide-react'

interface EmptyDashboardProps {
  onImport: () => void
}

export const EmptyDashboard = ({ onImport }: EmptyDashboardProps) => (
  <section aria-label="dashboard empty state" style={styles.root}>
    <section style={styles.hero}>
      <div style={styles.heroIntro}>
        <div style={styles.kicker}>Your dashboard is ready</div>
        <h2 style={styles.heading}>Bring in your ICICI statements</h2>
        <p style={styles.body}>
          Select one or more ICICI statement files to stage them, review any issues, and import the records without storing the source files.
        </p>
        <div style={styles.actionRow}>
          <button type="button" aria-label="Import statements from dashboard" style={styles.primaryButton} onClick={onImport}>
            <Upload size={16} />
            Import statements
          </button>
          <div style={styles.inlineNote}>
            <Sparkles size={16} />
            <span>Once imported, this space turns into your analysis dashboard.</span>
          </div>
        </div>
      </div>

      <div style={styles.heroPreview}>
        <div style={styles.previewHeader}>
          <div>
            <div style={styles.previewLabel}>Workspace preview</div>
            <div style={styles.previewTitle}>Finance overview</div>
          </div>
          <div style={styles.previewBadge}>Local-first</div>
        </div>

        <div style={styles.previewGrid}>
          <article style={styles.previewCardPrimary}>
            <div style={styles.previewCardIcon}><Landmark size={16} /></div>
            <div style={styles.previewCardLabel}>Wallet balance</div>
            <div style={styles.previewCardValue}>Ready after first import</div>
            <div style={styles.previewCardHint}>Track spend, cash flow, and imported statement coverage.</div>
          </article>

          <article style={styles.previewCard}>
            <div style={styles.previewCardIcon}><BarChart3 size={16} /></div>
            <div style={styles.previewCardLabel}>Insights lane</div>
            <div style={styles.previewPillRow}>
              <span style={styles.previewPill}>Week</span>
              <span style={styles.previewPill}>Month</span>
              <span style={styles.previewPill}>Year</span>
            </div>
          </article>

          <article style={styles.previewCardWide}>
            <div style={styles.previewBars}>
              <span style={{ ...styles.previewBar, height: 48 }} />
              <span style={{ ...styles.previewBar, height: 72 }} />
              <span style={{ ...styles.previewBar, height: 96, background: 'linear-gradient(180deg, rgba(15, 118, 110, 0.88), rgba(15, 118, 110, 0.36))' }} />
              <span style={{ ...styles.previewBar, height: 62 }} />
              <span style={{ ...styles.previewBar, height: 84 }} />
              <span style={{ ...styles.previewBar, height: 56 }} />
            </div>
            <div style={styles.previewCardHint}>Categories, merchants, and trends fill in here after your first import.</div>
          </article>
        </div>
      </div>
    </section>

    <section style={styles.metricsRow}>
      <article style={styles.metricCard}>
        <div style={styles.metricLabel}>Import pipeline</div>
        <div style={styles.metricValue}>Strict ICICI ingest</div>
        <div style={styles.metricHint}>CSV, XLS, XLSX with duplicate blocking and review-safe handling.</div>
      </article>
      <article style={styles.metricCard}>
        <div style={styles.metricLabel}>Privacy</div>
        <div style={styles.metricValue}>Source files stay out</div>
        <div style={styles.metricHint}>Walnut keeps parsed records and metadata, not the uploaded statements.</div>
      </article>
      <article style={styles.metricCard}>
        <div style={styles.metricLabel}>Ready next</div>
        <div style={styles.metricValue}>History and review queue</div>
        <div style={styles.metricHint}>Navigate imports, inspect batches, and return to unresolved items from one workspace.</div>
      </article>
    </section>
  </section>
)

const panelBase = {
  borderRadius: 'var(--radius-xl)',
  border: '1px solid var(--color-border)',
  background: 'rgba(226, 215, 197, 0.64)',
  boxShadow: 'var(--shadow-panel)'
}

const styles = {
  root: {
    width: '100%',
    display: 'grid',
    gap: 'var(--space-xl)'
  },
  hero: {
    ...panelBase,
    padding: 'var(--space-2xl)',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.1fr) minmax(360px, 0.9fr)',
    gap: 'var(--space-2xl)',
    alignItems: 'stretch'
  },
  heroIntro: {
    display: 'grid',
    alignContent: 'center',
    gap: 'var(--space-lg)'
  },
  kicker: {
    fontSize: 14,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: 'var(--color-accent)'
  },
  heading: {
    margin: 0,
    fontSize: 'clamp(2.6rem, 4vw, 4.3rem)',
    lineHeight: 0.96,
    maxWidth: 660
  },
  body: {
    margin: 0,
    maxWidth: 620,
    color: 'var(--color-muted)',
    fontSize: 18,
    lineHeight: 1.55
  },
  actionRow: {
    display: 'grid',
    gap: 'var(--space-lg)',
    justifyItems: 'start'
  },
  primaryButton: {
    minHeight: 58,
    border: 0,
    borderRadius: 999,
    background: 'var(--color-accent)',
    color: '#fff',
    padding: '0 24px',
    fontWeight: 700,
    fontSize: 18,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-sm)'
  },
  inlineNote: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    color: 'var(--color-muted)',
    fontWeight: 600
  },
  heroPreview: {
    borderRadius: 30,
    padding: 'var(--space-xl)',
    background: 'rgba(245, 241, 232, 0.8)',
    border: '1px solid rgba(30, 27, 22, 0.08)',
    display: 'grid',
    gap: 'var(--space-lg)'
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-md)',
    alignItems: 'start'
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--color-accent)'
  },
  previewTitle: {
    marginTop: 'var(--space-xs)',
    fontSize: 24,
    fontWeight: 700
  },
  previewBadge: {
    minHeight: 34,
    padding: '0 14px',
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(15, 118, 110, 0.1)',
    color: 'var(--color-accent)',
    fontWeight: 700
  },
  previewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 'var(--space-md)'
  },
  previewCardPrimary: {
    padding: 'var(--space-lg)',
    borderRadius: 24,
    background: 'linear-gradient(180deg, rgba(15, 118, 110, 0.14), rgba(245, 241, 232, 0.2))',
    border: '1px solid rgba(15, 118, 110, 0.14)',
    display: 'grid',
    gap: 'var(--space-sm)'
  },
  previewCard: {
    padding: 'var(--space-lg)',
    borderRadius: 24,
    background: 'rgba(30, 27, 22, 0.05)',
    border: '1px solid rgba(30, 27, 22, 0.08)',
    display: 'grid',
    gap: 'var(--space-sm)'
  },
  previewCardWide: {
    gridColumn: '1 / -1',
    padding: 'var(--space-lg)',
    borderRadius: 24,
    background: 'rgba(30, 27, 22, 0.05)',
    border: '1px solid rgba(30, 27, 22, 0.08)',
    display: 'grid',
    gap: 'var(--space-md)'
  },
  previewCardIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(245, 241, 232, 0.88)',
    color: 'var(--color-accent)'
  },
  previewCardLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--color-muted)'
  },
  previewCardValue: {
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1.15
  },
  previewCardHint: {
    color: 'var(--color-muted)',
    lineHeight: 1.45
  },
  previewPillRow: {
    display: 'flex',
    gap: 'var(--space-sm)',
    flexWrap: 'wrap' as const,
    marginTop: 'var(--space-xs)'
  },
  previewPill: {
    minHeight: 30,
    padding: '0 12px',
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(15, 118, 110, 0.08)',
    color: 'var(--color-accent)',
    fontWeight: 700,
    fontSize: 13
  },
  previewBars: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    alignItems: 'end',
    gap: 10,
    height: 120
  },
  previewBar: {
    borderRadius: 999,
    background: 'rgba(30, 27, 22, 0.12)'
  },
  metricsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 'var(--space-lg)'
  },
  metricCard: {
    ...panelBase,
    padding: 'var(--space-xl)',
    display: 'grid',
    gap: 'var(--space-sm)'
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--color-accent)'
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 700,
    lineHeight: 1.15
  },
  metricHint: {
    color: 'var(--color-muted)',
    lineHeight: 1.5
  }
} as const
