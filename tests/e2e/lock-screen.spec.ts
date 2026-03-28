import { test, expect } from '@playwright/test'

const runSetup = async (
  page: import('@playwright/test').Page,
  profile: { householdName: string; ownerName: string; pin: string } = {
    householdName: 'Walnut Home',
    ownerName: 'Bit',
    pin: '123456'
  },
  options: { clearStorage?: boolean } = { clearStorage: true }
) => {
  await page.goto('/')
  if (options.clearStorage !== false) {
    await page.evaluate(() => window.localStorage.clear())
  }
  await page.goto('/')
  await page.getByRole('button', { name: 'Start setup' }).click()
  await page.getByLabel('Household name').fill(profile.householdName)
  await page.getByLabel('Owner name').fill(profile.ownerName)
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('New PIN').fill(profile.pin)
  await page.getByLabel('Confirm PIN').fill(profile.pin)
  await page.getByLabel('Confirm PIN').press('Tab')
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('heading', { name: 'Save the one-time recovery key for this device.' })).toBeVisible()
  await page.getByRole('button', { name: 'Copy' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Skip for now' }).click()
  await page.getByRole('button', { name: 'Finish' }).click()
}

test('lock screen supports manual lock and recovery reset', async ({ page }) => {
  await runSetup(page)
  await page.getByRole('button', { name: 'Lock workspace from sidebar' }).click()
  await expect(page.getByRole('button', { name: 'Restore from backup' })).toBeVisible()
  const pinField = page.locator('#unlock-pin')
  await pinField.fill('123456')
  await expect(pinField).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'Show PIN' }).click()
  await expect(pinField).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Hide PIN' }).click()
  await expect(pinField).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'Unlock' }).click()
  await expect(page.getByRole('heading', { name: 'Bring in your ICICI statements' })).toBeVisible()
  await page.getByRole('button', { name: 'Lock workspace from sidebar' }).click()
  await page.getByRole('button', { name: 'Use recovery key' }).click()
  await expect(page.getByText('Reset PIN with recovery key:')).toBeVisible()
})

test('lock screen can start a fresh local profile setup', async ({ page }) => {
  await runSetup(page)
  await page.getByRole('button', { name: 'Lock workspace from sidebar' }).click()
  await page.getByRole('button', { name: 'Create new profile' }).click()
  await expect(page.getByRole('heading', { name: 'Create a new local profile' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Start a new local profile on this device?' })).toBeVisible()
  await page.getByRole('button', { name: 'Start new profile' }).click()
  await expect(page.getByRole('button', { name: 'Start setup' })).toBeVisible()
  await runSetup(
    page,
    {
      householdName: 'Kavita Home',
      ownerName: 'Kavita',
      pin: '654321'
    },
    { clearStorage: false }
  )
  await page.getByRole('button', { name: 'Lock workspace from sidebar' }).click()
  await expect(page.getByLabel('Local profile list').getByRole('button')).toHaveCount(2)
  await expect(page.getByLabel('Local profile list').getByText('Walnut Home')).toBeVisible()
  await expect(page.getByLabel('Local profile list').getByText('Kavita Home')).toBeVisible()
})
