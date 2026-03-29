import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../../src/renderer/App'

const APP_STATE_KEY = 'walnut.mock.app-state'
const EVENTS_KEY = 'walnut.mock.security-events'
const STAGED_FILES_KEY = 'walnut.mock.staged-import-files'
const IMPORT_HISTORY_KEY = 'walnut.mock.import-history'

const dashboardState = {
  currentView: 'dashboard',
  onboarding: {
    currentStep: 'finish',
    completedSteps: ['welcome', 'household-profile', 'pin-setup', 'recovery-key', 'account-profile', 'finish'],
    recoveryConfirmed: true,
    recoverySavedToDevice: true,
    profile: {
      householdName: 'Walnut Home',
      ownerName: 'Bit'
    }
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

beforeEach(() => {
  window.localStorage.clear()
  window.localStorage.setItem(APP_STATE_KEY, JSON.stringify(dashboardState))
  window.localStorage.setItem(EVENTS_KEY, JSON.stringify([]))
  window.localStorage.setItem(STAGED_FILES_KEY, JSON.stringify([]))
  window.localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify([]))
  delete (window as typeof window & { walnut?: unknown }).walnut
})

afterEach(() => {
  window.localStorage.clear()
  delete (window as typeof window & { walnut?: unknown }).walnut
})

describe('import workspace', () => {
  it('uses the left rail as the only lock surface and does not render the old top-right lock action', async () => {
    render(<App />)

    await screen.findByRole('heading', { name: 'Bring in your ICICI statements' })
    expect(screen.queryByRole('button', { name: 'Lock now' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lock workspace from sidebar' })).toBeVisible()
  })

  it('renders the shared import workspace, staged actions, Esc close behavior, and focus transfer after file selection', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Import statements from dashboard' }))
    await screen.findByRole('heading', { name: 'Import statements' })

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).not.toBeNull()

    await user.upload(fileInput, [
      new File(['valid'], 'mock-valid.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      new File(['ambiguous'], 'mock-ambiguous.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      new File(['duplicate'], 'mock-duplicate.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      new File(['unsupported'], 'mock-unsupported.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    ])

    const stagingHeading = await screen.findByRole('heading', { name: 'Review this staged import batch' })
    await waitFor(() => expect(stagingHeading).toHaveFocus())

    expect(screen.getByRole('button', { name: 'Review sheet' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'View reason' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'View earlier batch' })).toBeVisible()
    expect(screen.getAllByRole('button', { name: 'Remove' }).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'View reason' }))
    expect(screen.getByRole('heading', { name: 'ICICI columns were not recognized' })).toBeVisible()
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'ICICI columns were not recognized' })).not.toBeInTheDocument())
  })
})
