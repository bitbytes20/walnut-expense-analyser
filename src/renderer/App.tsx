import { FileSpreadsheet, History, LayoutDashboard, LockKeyhole, Rows3, ShieldCheck, Tags } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { AppShellState } from '../shared/contracts/app-state'
import type { TransactionRuleSuggestion } from '../shared/contracts/transactions'
import { EmptyDashboard } from './features/dashboard/EmptyDashboard'
import { CategoriesRulesScreen } from './features/categories-rules/CategoriesRulesScreen'
import { ImportBatchDetailScreen } from './features/import/ImportBatchDetailScreen'
import { ImportHistoryScreen } from './features/import/ImportHistoryScreen'
import { ImportWorkspace } from './features/import/ImportWorkspace'
import { ReviewQueueScreen } from './features/import/ReviewQueueScreen'
import { LockScreen } from './features/lock-screen/LockScreen'
import { OnboardingFlow } from './features/onboarding/OnboardingFlow'
import { AppShell } from './features/app-shell/AppShell'
import { TransactionsScreen } from './features/transactions/TransactionsScreen'
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
  const [workspaceScreen, setWorkspaceScreen] = useState<'home' | 'imports' | 'transactions' | 'categories-rules'>('home')
  const [importAreaScreen, setImportAreaScreen] = useState<ImportAreaScreen>({ type: 'workspace' })
  const [ruleSuggestionDraft, setRuleSuggestionDraft] = useState<TransactionRuleSuggestion['draft']>()
  const [loading, setLoading] = useState(true)

  const workspaceSidebar = (
    <div style={sidebarStyles.root}>
      <div style={sidebarStyles.cluster}>
        <button
          type="button"
          aria-label="Open dashboard workspace"
          style={{
            ...sidebarStyles.navButton,
            ...(workspaceScreen === 'home' ? sidebarStyles.navButtonActive : undefined)
          }}
          onClick={() => setWorkspaceScreen('home')}
        >
          <LayoutDashboard size={18} />
        </button>
        <button
          type="button"
          aria-label="Open import workspace"
          style={{
            ...sidebarStyles.navButton,
            ...(workspaceScreen === 'imports' && importAreaScreen.type === 'workspace' ? sidebarStyles.navButtonActive : undefined)
          }}
          onClick={() => {
            setWorkspaceScreen('imports')
            setImportAreaScreen({ type: 'workspace' })
          }}
        >
          <FileSpreadsheet size={18} />
        </button>
        <button
          type="button"
          aria-label="Open transactions workspace"
          style={{
            ...sidebarStyles.navButton,
            ...(workspaceScreen === 'transactions' ? sidebarStyles.navButtonActive : undefined)
          }}
          onClick={() => setWorkspaceScreen('transactions')}
        >
          <Rows3 size={18} />
        </button>
        <button
          type="button"
          aria-label="Open import history workspace"
          style={{
            ...sidebarStyles.navButton,
            ...(workspaceScreen === 'imports' && importAreaScreen.type === 'history' ? sidebarStyles.navButtonActive : undefined)
          }}
          onClick={() => {
            setWorkspaceScreen('imports')
            setImportAreaScreen({ type: 'history' })
          }}
        >
          <History size={18} />
        </button>
        <button
          type="button"
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

      <div style={sidebarStyles.cluster}>
        <button type="button" aria-label="Audit workspace placeholder" style={sidebarStyles.navButtonMuted} disabled>
          <ShieldCheck size={18} />
        </button>
        <button
          type="button"
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
      ) : (
        <EmptyDashboard onImport={() => setWorkspaceScreen('imports')} />
      )}
    </AppShell>
  )
}

const sidebarStyles = {
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 'var(--space-xl)',
    padding: 'var(--space-md) 0'
  },
  cluster: {
    display: 'grid',
    gap: 'var(--space-md)'
  },
  navButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
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
    width: 52,
    height: 52,
    borderRadius: 18,
    border: '1px solid rgba(30, 27, 22, 0.08)',
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-muted)',
    display: 'grid',
    placeItems: 'center'
  }
} as const

export default App
