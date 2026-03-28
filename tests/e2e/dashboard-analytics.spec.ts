import { expect, test } from '@playwright/test'

const initDashboardState = async (page: import('@playwright/test').Page) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'walnut.mock.app-state',
      JSON.stringify({
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
      })
    )
    window.localStorage.setItem('walnut.mock.security-events', '[]')
    window.localStorage.setItem('walnut.mock.staged-import-files', '[]')
    window.localStorage.setItem('walnut.mock.import-history', '[]')
    window.localStorage.setItem('walnut.mock.import-batch-details', '{}')
    window.localStorage.setItem('walnut.mock.resolved-review-items', '{}')
  })
}

test('renders live dashboard analytics after import and drills into the transaction ledger', async ({ page }) => {
  await initDashboardState(page)
  await page.goto('/')

  await page.getByRole('button', { name: 'Import statements from dashboard' }).click()

  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Import statements from workspace' }).click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles([
    { name: 'mock-valid.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('valid') }
  ])

  await page.getByRole('button', { name: 'Commit staged import batch' }).click()
  await expect(page.getByLabel('import summary').getByRole('heading', { name: 'Import statements' })).toBeVisible()

  await page.getByRole('button', { name: 'Open dashboard workspace' }).click()
  await expect(page.getByRole('heading', { name: 'See how this household earns, spends, and repeats over time.' })).toBeVisible()
  await expect(page.getByText('Total credited')).toBeVisible()
  await expect(page.getByText('Total debited')).toBeVisible()
  await expect(page.getByText('Difference')).toBeVisible()
  await expect(page.getByRole('button', { name: /Mock transaction/ }).first()).toBeVisible()

  await page.getByRole('button', { name: /Mock transaction/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible()
  await expect(page.getByRole('searchbox', { name: 'Search descriptions' })).toHaveValue('Mock transaction')
})
