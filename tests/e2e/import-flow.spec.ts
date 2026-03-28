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
  })
}

test('supports dashboard and dedicated import entry, worksheet resolution, duplicate inspection, and focus transfer', async ({ page }) => {
  await initDashboardState(page)
  await page.goto('/')

  await page.getByRole('button', { name: 'Import statements from dashboard' }).click()
  await expect(page.getByRole('heading', { name: 'Import statements' })).toBeVisible()
  await page.getByRole('button', { name: 'Back to dashboard' }).click()
  await expect(page.getByRole('heading', { name: 'Bring in your ICICI statements' })).toBeVisible()

  await page.getByRole('button', { name: 'Open import workspace' }).click()
  await expect(page.getByRole('heading', { name: 'Import statements' })).toBeVisible()

  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Import statements from workspace' }).focus()
  await page.keyboard.press('Enter')
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles([
    { name: 'mock-valid.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('valid') },
    { name: 'mock-ambiguous.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('ambiguous') },
    { name: 'mock-duplicate.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('duplicate') }
  ])

  await expect(page.getByRole('heading', { name: 'Review staged files' })).toBeFocused()
  await page.getByRole('button', { name: 'Review sheet' }).click()
  await expect(page.getByRole('heading', { name: 'Choose the worksheet for mock-ambiguous.xlsx' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: 'Choose the worksheet for mock-ambiguous.xlsx' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Review sheet' }).click()
  await page.getByRole('button', { name: /OpTransactionHistory/ }).click()
  await expect(page.getByRole('button', { name: 'View earlier batch' })).toBeVisible()
  await page.getByRole('button', { name: 'View earlier batch' }).click()
  await expect(page.getByRole('heading', { name: /Earlier batch:/ })).toBeVisible()
})

test('renders an all-failed summary without routing back to the dashboard', async ({ page }) => {
  await initDashboardState(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Import statements from dashboard' }).click()

  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Import statements from workspace' }).click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles([
    { name: 'mock-unsupported.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('unsupported') },
    { name: 'mock-duplicate.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('duplicate') }
  ])

  await page.getByRole('button', { name: 'View reason' }).click()
  await expect(page.getByRole('heading', { name: 'ICICI columns were not recognized' })).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Commit staged import batch' }).click()
  await expect(page.getByLabel('import summary').getByRole('heading', { name: 'Import statements' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Imported' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Rejected' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Duplicate blocked' })).toBeVisible()
  await expect(page.getByLabel('dashboard empty state')).toHaveCount(0)
})
