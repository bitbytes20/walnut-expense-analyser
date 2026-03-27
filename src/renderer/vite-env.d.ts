/// <reference types="vite/client" />

import type { WalnutApi } from '../shared/contracts/app-state'

declare global {
  interface Window {
    walnut: WalnutApi
  }
}

export {}
