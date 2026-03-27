import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  use: {
    trace: 'on-first-retry',
    baseURL: 'http://127.0.0.1:4317'
  },
  webServer: {
    command: 'npx serve -s out/renderer -l 4317',
    url: 'http://127.0.0.1:4317',
    reuseExistingServer: false
  }
})
