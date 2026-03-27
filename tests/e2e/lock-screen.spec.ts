import { test, expect } from '@playwright/test'

const runSetup = async (page: import('@playwright/test').Page) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start setup' }).click()
  await page.getByLabel('Household name').fill('Walnut Home')
  await page.getByLabel('Owner name').fill('Bit')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('New PIN').fill('123456')
  await page.getByLabel('Confirm PIN').fill('123456')
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
  await page.getByRole('button', { name: 'Lock now' }).click()
  await expect(page.getByRole('button', { name: 'Restore from backup' })).toBeVisible()
  await page.getByLabel('PIN').fill('123456')
  await page.getByRole('button', { name: 'Unlock' }).click()
  await expect(page.getByRole('heading', { name: 'Ready for your first import' })).toBeVisible()
  await page.getByRole('button', { name: 'Lock now' }).click()
  await page.getByRole('button', { name: 'Use recovery key' }).click()
  await expect(page.getByText('Reset PIN with recovery key:')).toBeVisible()
})
