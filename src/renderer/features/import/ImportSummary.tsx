import type { CommitImportBatchResult, StagedImportFile } from '../../../shared/contracts/import'

interface ImportSummaryProps {
  summary: CommitImportBatchResult
}

const Group = ({ title, files }: { title: 'Imported' | 'Rejected' | 'Duplicate blocked'; files: StagedImportFile[] }) => (
  <section style={styles.group}>
    <h3 style={styles.groupHeading}>{title}</h3>
    {files.length === 0 ? <p style={styles.empty}>No files in this group.</p> : null}
    {files.map((file) => (
      <article key={file.id} style={styles.fileCard}>
        <div style={styles.fileName}>{file.fileName}</div>
        <div style={styles.fileMeta}>
          {file.statementPeriodLabel ? <span>{file.statementPeriodLabel}</span> : null}
          {file.importedTransactionCount ? <span>{file.importedTransactionCount} transactions</span> : null}
          {file.reasonTitle ? <span>{file.reasonTitle}</span> : null}
        </div>
      </article>
    ))}
  </section>
)

export const ImportSummary = ({ summary }: ImportSummaryProps) => (
  <section aria-label="import summary" style={styles.root}>
    <div style={styles.headerCard}>
      <div style={styles.kicker}>Import summary</div>
      <h2 style={styles.heading}>Import statements</h2>
      <p style={styles.body}>
        {summary.transactionsCreated > 0
          ? `Walnut imported ${summary.transactionsCreated} transactions from ${summary.importedFiles.length} file${summary.importedFiles.length === 1 ? '' : 's'}.`
          : 'No files were imported, but Walnut kept every result visible so you can review what happened.'}
      </p>
      {summary.lazyAccountCreated ? <div style={styles.accountBanner}>Walnut created the ICICI account profile from your first successful import.</div> : null}
    </div>
    <div style={styles.groups}>
      <Group title="Imported" files={summary.importedFiles} />
      <Group title="Rejected" files={summary.rejectedFiles} />
      <Group title="Duplicate blocked" files={summary.duplicateBlockedFiles} />
    </div>
  </section>
)

const styles = {
  root: {
    display: 'grid',
    gap: 'var(--space-xl)'
  },
  headerCard: {
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-xl)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(226, 215, 197, 0.72)'
  },
  kicker: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-accent)'
  },
  heading: {
    margin: 0,
    fontSize: 'var(--font-display-size)'
  },
  body: {
    margin: 0,
    color: 'var(--color-muted)'
  },
  accountBanner: {
    padding: 'var(--space-md)',
    borderRadius: 18,
    background: 'rgba(15, 118, 110, 0.12)',
    color: 'var(--color-accent)',
    fontWeight: 700
  },
  groups: {
    display: 'grid',
    gap: 'var(--space-lg)'
  },
  group: {
    display: 'grid',
    gap: 'var(--space-md)',
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.72)'
  },
  groupHeading: {
    margin: 0,
    fontSize: 'var(--font-heading-size)'
  },
  empty: {
    margin: 0,
    color: 'var(--color-muted)'
  },
  fileCard: {
    display: 'grid',
    gap: 'var(--space-sm)',
    padding: 'var(--space-md)',
    borderRadius: 18,
    background: 'rgba(226, 215, 197, 0.56)'
  },
  fileName: {
    fontWeight: 700
  },
  fileMeta: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 'var(--space-sm)',
    color: 'var(--color-muted)',
    fontSize: 14
  }
}
