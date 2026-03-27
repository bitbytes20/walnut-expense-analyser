import '@testing-library/jest-dom'

declare global {
  interface Window {
    walnut: import('../../src/shared/contracts/app-state').WalnutApi
  }
}
