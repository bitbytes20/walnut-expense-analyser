import { Landmark, LockKeyhole } from 'lucide-react'
import type { PropsWithChildren, ReactNode } from 'react'

interface AppShellProps extends PropsWithChildren {
  title: string
  eyebrow: string
  actions?: ReactNode
}

export const AppShell = ({ title, eyebrow, actions, children }: AppShellProps) => (
  <div style={shellStyles.root}>
    <header style={shellStyles.header}>
      <div style={shellStyles.brand}>
        <div style={shellStyles.brandBadge}>
          <Landmark size={18} strokeWidth={2.2} />
        </div>
        <div>
          <div style={shellStyles.eyebrow}>Walnut Expense Analyser</div>
          <h1 style={shellStyles.title}>{title}</h1>
          <div style={shellStyles.supporting}>{eyebrow}</div>
        </div>
      </div>
      <div style={shellStyles.actions}>
        {actions ?? (
          <button type="button" style={shellStyles.ghostButton} disabled aria-disabled="true">
            <LockKeyhole size={16} />
            Lock now
          </button>
        )}
      </div>
    </header>
    <main style={shellStyles.main}>{children}</main>
  </div>
)

const shellStyles = {
  root: {
    minHeight: '100vh',
    padding: 'var(--space-xl)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-xl)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 'var(--space-lg)'
  },
  brand: {
    display: 'flex',
    gap: 'var(--space-md)',
    alignItems: 'flex-start'
  },
  brandBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    display: 'grid',
    placeItems: 'center',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)'
  },
  eyebrow: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-accent)',
    marginBottom: 'var(--space-xs)'
  },
  title: {
    fontSize: 'var(--font-display-size)',
    lineHeight: 1.1,
    margin: 0
  },
  supporting: {
    marginTop: 'var(--space-sm)',
    color: 'var(--color-muted)'
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 48
  },
  ghostButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    minHeight: 44,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-ink)',
    padding: '0 18px',
    fontWeight: 600
  },
  main: {
    flex: 1,
    display: 'grid',
    placeItems: 'center'
  }
}
