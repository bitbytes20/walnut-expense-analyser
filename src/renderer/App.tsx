import { FileSpreadsheet, History, LayoutDashboard, LockKeyhole, Rows3, Settings, ShieldCheck, Tags } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { AppShellState } from '../shared/contracts/app-state'
import type { TransactionLedgerQuery, TransactionRuleSuggestion } from '../shared/contracts/transactions'
import { AuditScreen } from './features/audit/AuditScreen'
import { DashboardScreen } from './features/dashboard/DashboardScreen'
import { CategoriesRulesScreen } from './features/categories-rules/CategoriesRulesScreen'
import { ImportBatchDetailScreen } from './features/import/ImportBatchDetailScreen'
import { ImportHistoryScreen } from './features/import/ImportHistoryScreen'
import { ImportWorkspace } from './features/import/ImportWorkspace'
import { ReviewQueueScreen } from './features/import/ReviewQueueScreen'
import { LockScreen } from './features/lock-screen/LockScreen'
import { OnboardingFlow } from './features/onboarding/OnboardingFlow'
import { AppShell } from './features/app-shell/AppShell'
import { SettingsScreen } from './features/settings/SettingsScreen'
import { TransactionsScreen } from './features/transactions/TransactionsScreen'
import { createMockWalnutApi } from './mockWalnutApi'

type WorkspaceScreen = 'home' | 'imports' | 'transactions' | 'categories-rules' | 'audit' | 'settings'

export interface GlobalShortcutActions {
  setWorkspaceScreen: (screen: WorkspaceScreen) => void
  setImportAreaScreen: (screen: { type: 'workspace' | 'history' }) => void
  lockApp: () => void
}

export function handleGlobalShortcut(event: KeyboardEvent, actions: GlobalShortcutActions): boolean {
  // Guard: ignore when focus is on form elements
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return false
  }

  // Guard: only Ctrl without Alt, Shift, or Meta
  if (!event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) {
    return false
  }

  switch (event.key) {
    case '1': event.preventDefault(); actions.setWorkspaceScreen('home'); return true
    case '2': event.preventDefault(); actions.setWorkspaceScreen('imports'); actions.setImportAreaScreen({ type: 'workspace' }); return true
    case '3': event.preventDefault(); actions.setWorkspaceScreen('transactions'); return true
    case '4': event.preventDefault(); actions.setWorkspaceScreen('imports'); actions.setImportAreaScreen({ type: 'history' }); return true
    case '5': event.preventDefault(); actions.setWorkspaceScreen('categories-rules'); return true
    case '6': event.preventDefault(); actions.setWorkspaceScreen('audit'); return true
    case '7': event.preventDefault(); actions.setWorkspaceScreen('settings'); return true
    case '8': event.preventDefault(); actions.lockApp(); return true
    default: return false
  }
}

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
  },
  deviceProfiles: []
}

type ImportAreaScreen =
  | { type: 'workspace' }
  | { type: 'history' }
  | { type: 'batch-detail'; batchId: string; batchLabel: string }
  | { type: 'review-queue'; batchId?: string; batchLabel?: string }

export const App = () => {
  const [state, setState] = useState<AppShellState>(fallbackState)
  const [workspaceScreen, setWorkspaceScreen] = useState<WorkspaceScreen>('home')
  const [importAreaScreen, setImportAreaScreen] = useState<ImportAreaScreen>({ type: 'workspace' })
  const [ruleSuggestionDraft, setRuleSuggestionDraft] = useState<TransactionRuleSuggestion['draft']>()
  const [transactionsNavigationQuery, setTransactionsNavigationQuery] = useState<TransactionLedgerQuery>()
  const [transactionsNavigationVersion, setTransactionsNavigationVersion] = useState(0)
  const [loading, setLoading] = useState(true)

  const workspaceSidebar = (
    <div style={sidebarStyles.root}>
      <div style={sidebarStyles.cluster}>
        <button
          type="button"
          title="Dashboard (Ctrl+1)"
          aria-label="Open dashboard workspace"
          style={{
            ...sidebarStyles.navButton,
            ...(workspaceScreen === 'home' ? sidebarStyles.navButtonActive : undefined)
          }}
          onClick={() => {
            setTransactionsNavigationQuery(undefined)
            setWorkspaceScreen('home')
          }}
        >
          <LayoutDashboard size={18} />
        </button>
        <button
          type="button"
          title="Import (Ctrl+2)"
          aria-label="Open import workspace"
          style={{
            ...sidebarStyles.navButton,
            ...(workspaceScreen === 'imports' && importAreaScreen.type === 'workspace' ? sidebarStyles.navButtonActive : undefined)
          }}
          onClick={() => {
            setTransactionsNavigationQuery(undefined)
            setWorkspaceScreen('imports')
            setImportAreaScreen({ type: 'workspace' })
          }}
        >
          <FileSpreadsheet size={18} />
        </button>
        <button
          type="button"
          title="Transactions (Ctrl+3)"
          aria-label="Open transactions workspace"
          style={{
            ...sidebarStyles.navButton,
            ...(workspaceScreen === 'transactions' ? sidebarStyles.navButtonActive : undefined)
          }}
          onClick={() => {
            setTransactionsNavigationQuery(undefined)
            setTransactionsNavigationVersion((current) => current + 1)
            setWorkspaceScreen('transactions')
          }}
        >
          <Rows3 size={18} />
        </button>
        <button
          type="button"
          title="Import History (Ctrl+4)"
          aria-label="Open import history workspace"
          style={{
            ...sidebarStyles.navButton,
            ...(workspaceScreen === 'imports' && importAreaScreen.type === 'history' ? sidebarStyles.navButtonActive : undefined)
          }}
          onClick={() => {
            setTransactionsNavigationQuery(undefined)
            setWorkspaceScreen('imports')
            setImportAreaScreen({ type: 'history' })
          }}
        >
          <History size={18} />
        </button>
        <button
          type="button"
          title="Categories & Rules (Ctrl+5)"
          aria-label="Open categories and rules workspace"
          style={{
            ...sidebarStyles.navButton,
            ...(workspaceScreen === 'categories-rules' ? sidebarStyles.navButtonActive : undefined)
          }}
          onClick={() => setWorkspaceScreen('categories-rules')}
        >
          <Tags size={18} />
        </button>
      </div>

      <div style={{ ...sidebarStyles.cluster, marginTop: 'auto' }}>
        <button
          type="button"
          title="Audit Log (Ctrl+6)"
          aria-label="Open audit workspace"
          style={{
            ...sidebarStyles.navButton,
            ...(workspaceScreen === 'audit' ? sidebarStyles.navButtonActive : undefined)
          }}
          onClick={() => setWorkspaceScreen('audit')}
        >
          <ShieldCheck size={18} />
        </button>
        <button
          type="button"
          title="Settings (Ctrl+7)"
          aria-label="Open settings"
          style={{
            ...sidebarStyles.navButton,
            ...(workspaceScreen === 'settings' ? sidebarStyles.navButtonActive : undefined)
          }}
          onClick={() => setWorkspaceScreen('settings')}
        >
          <Settings size={18} />
        </button>
        <button
          type="button"
          title="Lock (Ctrl+8)"
          aria-label="Lock workspace from sidebar"
          style={sidebarStyles.navButton}
          onClick={() =>
            void window.walnut.lockNow().then((nextState) =>
              setState({
                ...nextState,
                currentView: 'locked'
              })
            )
          }
        >
          <LockKeyhole size={18} />
        </button>
      </div>
    </div>
  )

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
      setWorkspaceScreen('home')
      setImportAreaScreen({ type: 'workspace' })
    }
  }, [state.currentView])

  useEffect(() => {
    if (state.currentView !== 'dashboard') return
    const handler = (event: KeyboardEvent) => {
      handleGlobalShortcut(event, {
        setWorkspaceScreen,
        setImportAreaScreen,
        lockApp: () => void window.walnut.lockNow().then((nextState) => setState({ ...nextState, currentView: 'locked' }))
      })
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
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
      eyebrow={
        workspaceScreen === 'imports'
          ? 'Stage, review, and import without storing source files'
          : workspaceScreen === 'transactions'
            ? 'Search, filter, and correct imported records from one local ledger'
            : workspaceScreen === 'categories-rules'
              ? 'Manage protected categories, user taxonomy, and reusable rule automation'
              : workspaceScreen === 'audit'
                ? 'Chronological event ledger for security, edits, and review activity'
                : workspaceScreen === 'settings'
                  ? 'Configure preferences and export diagnostics for support'
                  : 'Your local finance workspace is ready'
      }
      sidebar={workspaceSidebar}
      contentMode="workspace"
    >
      {workspaceScreen === 'imports' ? (
        importAreaScreen.type === 'workspace' ? (
          <ImportWorkspace
            onBackToDashboard={() => setWorkspaceScreen('home')}
            onOpenHistory={() => setImportAreaScreen({ type: 'history' })}
          />
        ) : importAreaScreen.type === 'history' ? (
          <ImportHistoryScreen
            onBackToWorkspace={() => setImportAreaScreen({ type: 'workspace' })}
            onOpenBatchDetail={(batchId, batchLabel) => setImportAreaScreen({ type: 'batch-detail', batchId, batchLabel })}
            onOpenReviewQueue={(batchId, batchLabel) => setImportAreaScreen({ type: 'review-queue', batchId, batchLabel })}
          />
        ) : importAreaScreen.type === 'batch-detail' ? (
          <ImportBatchDetailScreen
            batchId={importAreaScreen.batchId}
            batchLabel={importAreaScreen.batchLabel}
            onBackToHistory={() => setImportAreaScreen({ type: 'history' })}
            onReviewUnresolvedItems={() =>
              setImportAreaScreen({
                type: 'review-queue',
                batchId: importAreaScreen.batchId,
                batchLabel: importAreaScreen.batchLabel
              })
            }
          />
        ) : (
          <ReviewQueueScreen
            initialBatchId={importAreaScreen.batchId}
            onBackToHistory={() => setImportAreaScreen({ type: 'history' })}
          />
        )
      ) : workspaceScreen === 'transactions' ? (
        <TransactionsScreen
          navigationQuery={transactionsNavigationQuery}
          navigationVersion={transactionsNavigationVersion}
          onUseRuleSuggestion={(suggestion) => {
            setRuleSuggestionDraft(suggestion.draft)
            setWorkspaceScreen('categories-rules')
          }}
        />
      ) : workspaceScreen === 'categories-rules' ? (
        <CategoriesRulesScreen
          initialRuleDraft={ruleSuggestionDraft}
          onRuleDraftHandled={() => setRuleSuggestionDraft(undefined)}
        />
      ) : workspaceScreen === 'audit' ? (
        <AuditScreen />
      ) : workspaceScreen === 'settings' ? (
        <SettingsScreen />
      ) : (
        <DashboardScreen
          onImport={() => setWorkspaceScreen('imports')}
          onOpenLedger={(query) => {
            setTransactionsNavigationQuery(query)
            setTransactionsNavigationVersion((current) => current + 1)
            setWorkspaceScreen('transactions')
          }}
        />
      )}
    </AppShell>
  )
}

const sidebarStyles = {
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 'var(--space-sm)',
    padding: 'var(--space-sm) 0'
  },
  cluster: {
    display: 'grid',
    gap: 'var(--space-sm)'
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    border: '1px solid rgba(30, 27, 22, 0.12)',
    background: 'rgba(245, 241, 232, 0.82)',
    color: 'var(--color-muted)',
    display: 'grid',
    placeItems: 'center'
  },
  navButtonActive: {
    background: 'linear-gradient(180deg, rgba(15, 118, 110, 0.96), rgba(10, 90, 84, 0.92))',
    color: '#fff',
    border: '1px solid rgba(15, 118, 110, 0.3)'
  },
  navButtonMuted: {
    width: 44,
    height: 44,
    borderRadius: 14,
    border: '1px solid rgba(30, 27, 22, 0.08)',
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-muted)',
    display: 'grid',
    placeItems: 'center'
  }
} as const

export default App
