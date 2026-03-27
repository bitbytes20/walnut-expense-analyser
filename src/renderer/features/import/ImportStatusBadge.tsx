import type { ImportAttemptStatus } from '../../../shared/contracts/import'

const LABELS: Record<ImportAttemptStatus, string> = {
  imported: 'Imported',
  'needs-review': 'Needs review',
  rejected: 'Rejected',
  failed: 'Failed'
}

const COLORS: Record<ImportAttemptStatus, { border: string; background: string; color: string }> = {
  imported: {
    border: '1px solid rgba(15, 118, 110, 0.24)',
    background: 'rgba(15, 118, 110, 0.12)',
    color: 'var(--color-accent)'
  },
  'needs-review': {
    border: '1px solid rgba(180, 35, 24, 0.18)',
    background: 'rgba(180, 35, 24, 0.08)',
    color: '#7a271a'
  },
  rejected: {
    border: '1px solid rgba(30, 27, 22, 0.14)',
    background: 'rgba(30, 27, 22, 0.06)',
    color: 'var(--color-ink)'
  },
  failed: {
    border: '1px solid rgba(180, 35, 24, 0.24)',
    background: 'rgba(180, 35, 24, 0.12)',
    color: '#7a271a'
  }
}

interface ImportStatusBadgeProps {
  status: ImportAttemptStatus
}

export const ImportStatusBadge = ({ status }: ImportStatusBadgeProps) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      minHeight: 32,
      borderRadius: 999,
      padding: '0 12px',
      fontSize: 14,
      fontWeight: 700,
      ...COLORS[status]
    }}
  >
    {LABELS[status]}
  </span>
)
