import { contextBridge, ipcRenderer } from 'electron'
import type { WalnutApi } from '../shared/contracts/app-state'

const walnutApi: WalnutApi = {
  loadAppState: () => ipcRenderer.invoke('app-state:load'),
  saveOnboardingProgress: (input) => ipcRenderer.invoke('app-state:save-onboarding-progress', input),
  completeOnboarding: (input) => ipcRenderer.invoke('app-state:complete-onboarding', input),
  lockNow: (reason) => ipcRenderer.invoke('security:lock-now', reason),
  unlockWithPin: (pin) => ipcRenderer.invoke('security:unlock-with-pin', pin),
  beginRecoveryReset: (payload) => ipcRenderer.invoke('security:begin-recovery-reset', payload),
  saveAccountProfile: (draft) => ipcRenderer.invoke('app-state:save-account-profile', draft),
  copyRecoveryKeyAcknowledged: () => ipcRenderer.invoke('app-state:copy-recovery-ack'),
  downloadRecoveryKeyAcknowledged: () => ipcRenderer.invoke('app-state:download-recovery-ack'),
  getSecurityEvents: () => ipcRenderer.invoke('app-state:get-security-events'),
  ping: () => ipcRenderer.invoke('app-state:ping')
}

contextBridge.exposeInMainWorld('walnut', walnutApi)
