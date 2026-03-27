import { useEffect, useState } from 'react'
import type { AppShellState } from '../shared/contracts/app-state'
import { EmptyDashboard } from './features/dashboard/EmptyDashboard'
import { ImportWorkspace } from './features/import/ImportWorkspace'
import { LockScreen } from './features/lock-screen/LockScreen'
import { OnboardingFlow } from './features/onboarding/OnboardingFlow'
import { AppShell } from './features/app-shell/AppShell'
import { createMockWalnutApi } from './mockWalnutApi'

const fallbackState: AppShellState = {
  currentView: 'onboarding',
  onboarding: {
    currentStep: 'welcome',
    completedSteps: [],
    recoveryConfirmed: false,
    recoverySavedToDevice: false
  },
  security: {
    failedAttempts: 0,
    isLocked: false
  },
  dashboard: {
    heading: 'Ready for your first import',
    body: 'Add your first ICICI statement to create the account timeline and unlock dashboard insights.',
    primaryActionLabel: 'Import your first statement'
  }
}

export const App = () => {
  const [state, setState] = useState<AppShellState>(fallbackState)
  const [dashboardScreen, setDashboardScreen] = useState<'home' | 'imports'>('home')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!window.walnut) {
      window.walnut = createMockWalnutApi()
    }
    void window.walnut.loadAppState().then((loadedState) => {
      setState(loadedState)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (state.currentView !== 'dashboard') {
      setDashboardScreen('home')
    }
  }, [state.currentView])

  if (loading) {
    return (
      <AppShell title="Walnut Expense Analyser" eyebrow="Loading your local workspace">
        <div aria-label="loading">Loading…</div>
      </AppShell>
    )
  }

  if (state.currentView === 'onboarding') {
    return <OnboardingFlow state={state} setState={setState} />
  }

  if (state.currentView === 'locked') {
    return <LockScreen state={state} setState={setState} />
  }

  return (
    <AppShell
      title="Walnut household"
      eyebrow={dashboardScreen === 'imports' ? 'Stage, review, and import without storing source files' : 'Your local finance workspace is ready'}
      actions={
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <button
            type="button"
            style={{
              minHeight: 44,
              borderRadius: 999,
              border: dashboardScreen === 'home' ? '1px solid var(--color-accent)' : '1px solid rgba(30, 27, 22, 0.18)',
              background: dashboardScreen === 'home' ? 'rgba(15, 118, 110, 0.12)' : 'rgba(30, 27, 22, 0.04)',
              color: dashboardScreen === 'home' ? 'var(--color-accent)' : 'var(--color-ink)',
              padding: '0 20px',
              fontWeight: 700
            }}
            onClick={() => setDashboardScreen('home')}
          >
            Dashboard
          </button>
          <button
            type="button"
            aria-label="Open import statements screen"
            style={{
              minHeight: 44,
              borderRadius: 999,
              border: dashboardScreen === 'imports' ? '1px solid var(--color-accent)' : '1px solid rgba(30, 27, 22, 0.18)',
              background: dashboardScreen === 'imports' ? 'rgba(15, 118, 110, 0.12)' : 'rgba(30, 27, 22, 0.04)',
              color: dashboardScreen === 'imports' ? 'var(--color-accent)' : 'var(--color-ink)',
              padding: '0 20px',
              fontWeight: 700
            }}
            onClick={() => setDashboardScreen('imports')}
          >
            Import Statements
          </button>
          <button
            type="button"
            style={{
              minHeight: 44,
              borderRadius: 999,
              border: '1px solid rgba(30, 27, 22, 0.18)',
              background: 'rgba(30, 27, 22, 0.04)',
              color: 'var(--color-ink)',
              padding: '0 20px',
              fontWeight: 600
            }}
            onClick={() =>
              void window.walnut.lockNow().then((nextState) =>
                setState({
                  ...nextState,
                  currentView: 'locked'
                })
              )
            }
          >
            Lock now
          </button>
        </div>
      }
    >
      {dashboardScreen === 'imports' ? (
        <ImportWorkspace onBackToDashboard={() => setDashboardScreen('home')} />
      ) : (
        <EmptyDashboard onImport={() => setDashboardScreen('imports')} />
      )}
    </AppShell>
  )
}

export default App
