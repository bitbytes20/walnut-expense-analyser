import { Landmark } from 'lucide-react'
import type { PropsWithChildren, ReactNode } from 'react'

interface AppShellProps extends PropsWithChildren {
  title: string
  eyebrow: string
  actions?: ReactNode
  sidebar?: ReactNode
  appName?: string
  contentMode?: 'centered' | 'workspace'
}

export const AppShell = ({ title, eyebrow, actions, sidebar, appName = 'Walnut Expense Analyser', contentMode = 'centered', children }: AppShellProps) => (
  <div style={shellStyles.root}>
    <header style={shellStyles.header}>
      <div style={shellStyles.brand}>
        <div style={shellStyles.brandBadge}>
          <Landmark size={18} strokeWidth={2.2} />
        </div>
        <div>
          <div style={shellStyles.eyebrow}>{appName}</div>
          <h1 style={shellStyles.title}>{title}</h1>
          <div style={shellStyles.supporting}>{eyebrow}</div>
        </div>
      </div>
      <div style={shellStyles.actions}>{actions ?? null}</div>
    </header>
    <div style={contentMode === 'workspace' ? shellStyles.workspaceFrame : shellStyles.standardFrame}>
      {sidebar ? <aside style={shellStyles.sidebar}>{sidebar}</aside> : null}
      <main style={contentMode === 'workspace' ? shellStyles.workspaceMain : shellStyles.main}>{children}</main>
    </div>
  </div>
)

const shellStyles = {
  root: {
    height: '100vh',
    overflow: 'hidden',
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
  standardFrame: {
    flex: 1,
    display: 'grid'
  },
  workspaceFrame: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '72px minmax(0, 1fr)',
    gridTemplateRows: '1fr',
    gap: 'var(--space-xl)',
    alignItems: 'stretch'
  },
  sidebar: {
    minHeight: '100%',
    borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--color-border)',
    background: 'rgba(226, 215, 197, 0.64)',
    boxShadow: 'var(--shadow-panel)',
    padding: 'var(--space-lg) var(--space-sm)'
  },
  main: {
    flex: 1,
    display: 'grid',
    placeItems: 'center'
  },
  workspaceMain: {
    minWidth: 0,
    overflowY: 'auto' as const,
    display: 'grid',
    alignItems: 'start'
  }
}
