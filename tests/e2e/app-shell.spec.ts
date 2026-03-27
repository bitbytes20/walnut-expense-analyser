import { test, expect } from '@playwright/test'

test('app shell shows onboarding on first launch', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByLabel('onboarding frame')).toBeVisible()
  await expect(page.getByText('Step 1 of 6')).toBeVisible()
})
