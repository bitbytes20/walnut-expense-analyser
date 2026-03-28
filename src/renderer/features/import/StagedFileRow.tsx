import { FileSpreadsheet, FileWarning, History, Layers3, Trash2 } from 'lucide-react'
import type { StagedImportFile } from '../../../shared/contracts/import'

interface StagedFileRowProps {
  file: StagedImportFile
  onReviewSheet: (fileId: string) => void
  onViewReason: (fileId: string) => void
  onViewEarlierBatch: (fileId: string) => void
  onRemove: (fileId: string) => void
}

const getStatusTone = (status: StagedImportFile['status']) => {
  switch (status) {
    case 'ready':
    case 'imported':
      return {
        label: status === 'ready' ? 'Ready' : 'Imported',
        background: 'rgba(15, 118, 110, 0.12)',
        color: 'var(--color-accent)'
      }
    case 'needs-sheet-selection':
      return {
        label: 'Needs sheet selection',
        background: 'rgba(230, 163, 49, 0.16)',
        color: '#8A5B12'
      }
    case 'duplicate-blocked':
      return {
        label: 'Duplicate blocked',
        background: 'rgba(180, 35, 24, 0.12)',
        color: 'var(--color-destructive)'
      }
    default:
      return {
        label: 'Rejected',
        background: 'rgba(180, 35, 24, 0.12)',
        color: 'var(--color-destructive)'
      }
  }
}

const getAction = (file: StagedImportFile) => {
  if (file.status === 'needs-sheet-selection') {
    return { label: 'Review sheet', icon: Layers3 }
  }

  if (file.status === 'duplicate-blocked') {
    return { label: 'View earlier batch', icon: History }
  }

  if (file.status === 'rejected') {
    return { label: 'View reason', icon: FileWarning }
  }

  return undefined
}

export const StagedFileRow = ({ file, onReviewSheet, onViewReason, onViewEarlierBatch, onRemove }: StagedFileRowProps) => {
  const tone = getStatusTone(file.status)
  const action = getAction(file)

  return (
    <article style={styles.card}>
      <div style={styles.identity}>
        <div style={styles.iconWrap}>
          <FileSpreadsheet size={18} strokeWidth={2} />
        </div>
        <div style={styles.meta}>
          <div style={styles.titleRow}>
            <div style={styles.fileName}>{file.fileName}</div>
            <span style={{ ...styles.statusBadge, background: tone.background, color: tone.color }}>{tone.label}</span>
          </div>
          <div style={styles.fileMeta}>
            <span style={styles.fileBadge}>{file.fileExtension.toUpperCase()}</span>
            {file.accountLabel ? <span>{file.accountLabel}</span> : null}
            {file.statementPeriodLabel ? <span>{file.statementPeriodLabel}</span> : null}
            {file.warnings?.length ? <span style={styles.warning}>Check after import</span> : null}
          </div>
        </div>
      </div>

      <div style={styles.actions}>
        {action ? (
          <button
            type="button"
            style={styles.ghostButton}
            onClick={() => {
              if (file.status === 'needs-sheet-selection') {
                onReviewSheet(file.id)
                return
              }
              if (file.status === 'duplicate-blocked') {
                onViewEarlierBatch(file.id)
                return
              }
              onViewReason(file.id)
            }}
          >
            <action.icon size={16} strokeWidth={2} />
            {action.label}
          </button>
        ) : null}
        <button type="button" style={styles.removeButton} onClick={() => onRemove(file.id)}>
          <Trash2 size={16} strokeWidth={2} />
          Remove
        </button>
      </div>
    </article>
  )
}

const styles = {
  card: {
    display: 'grid',
    gap: 'var(--space-md)',
    width: '100%',
    padding: '20px var(--space-lg)',
    borderRadius: 'var(--radius-md)',
    background: 'rgba(226, 215, 197, 0.56)',
    border: '1px solid var(--color-border)'
  },
  identity: {
    display: 'flex',
    gap: 'var(--space-md)',
    alignItems: 'flex-start'
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(15, 118, 110, 0.1)',
    color: 'var(--color-accent)'
  },
  meta: {
    display: 'grid',
    gap: 'var(--space-sm)',
    flex: 1
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-md)',
    alignItems: 'center',
    flexWrap: 'wrap' as const
  },
  fileName: {
    fontSize: 16,
    fontWeight: 700
  },
  fileMeta: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 'var(--space-sm)',
    color: 'var(--color-muted)',
    fontSize: 14
  },
  fileBadge: {
    padding: '4px 10px',
    borderRadius: 999,
    background: 'rgba(30, 27, 22, 0.06)',
    color: 'var(--color-ink)',
    fontWeight: 700
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 700
  },
  warning: {
    fontSize: 13,
    fontWeight: 600,
    color: '#8A5B12'
  },
  actions: {
    display: 'flex',
    gap: 'var(--space-sm)',
    flexWrap: 'wrap' as const,
    alignItems: 'center'
  },
  ghostButton: {
    minHeight: 44,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-ink)',
    padding: '0 18px',
    fontWeight: 600
  },
  removeButton: {
    minHeight: 44,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    borderRadius: 999,
    border: '1px solid rgba(180, 35, 24, 0.25)',
    background: 'rgba(180, 35, 24, 0.06)',
    color: 'var(--color-destructive)',
    padding: '0 18px',
    fontWeight: 700
  }
} as const
