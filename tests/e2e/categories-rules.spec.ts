import { expect, test } from '@playwright/test'

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

test('manages local categories and rules from the dedicated workspace', async ({ page }) => {
  await page.addInitScript(({ appState }) => {
    window.localStorage.setItem('walnut.mock.app-state', JSON.stringify(appState))
    window.localStorage.setItem('walnut.mock.security-events', '[]')
    window.localStorage.setItem('walnut.mock.categories', '[]')
    window.localStorage.setItem('walnut.mock.rules', '[]')
  }, { appState: dashboardState })

  await page.goto('/')

  await page.getByRole('button', { name: 'Open categories and rules workspace' }).click()
  await expect(page.getByRole('heading', { name: 'Categories & Rules' })).toBeVisible()

  await page.getByRole('button', { name: 'Add category' }).click()
  await expect(page.getByRole('heading', { name: 'Create a user category' })).toBeVisible()
  await page.getByLabel('Name').fill('Fuel')
  await page.getByRole('button', { name: 'Create category' }).click()
  await expect(page.locator('strong').filter({ hasText: 'Fuel' }).first()).toBeVisible()

  await page.getByRole('button', { name: 'Add rule' }).click()
  await expect(page.getByRole('heading', { name: 'Create reusable rule' })).toBeVisible()
  await page.getByLabel('Rule name').fill('Fuel rule')
  await page.getByLabel('Description keywords').fill('fuel, petrol')
  await page.locator('label').filter({ hasText: 'Transaction type' }).locator('select').first().selectOption('expense')
  await page.getByLabel('Assign category').selectOption({ label: 'Fuel' })
  await page.getByRole('button', { name: 'Save rule' }).click()

  await expect(page.getByText('Fuel rule')).toBeVisible()
  await expect(page.getByText('types: expense')).toBeVisible()
})
