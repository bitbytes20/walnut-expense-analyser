import { BrowserWindow, ipcMain } from 'electron'
import type { ChangePinInput } from '../../shared/contracts/app-state'
import type { LockReason, RecoveryResetPayload } from '../../shared/contracts/security'
import { getWalnutRepository } from '../persistence/db'
import { beginRecoveryReset, changePin, unlockWithPin } from '../security/pin-service'
import { SessionLockManager } from '../security/session-lock'

export const registerSecurityIpc = (window: BrowserWindow, sessionLock: SessionLockManager) => {
  const repository = getWalnutRepository()

  ipcMain.handle('security:lock-now', (_event, reason: LockReason = 'manual') => sessionLock.lock(window, reason))
  ipcMain.handle('security:unlock-with-pin', (_event, pin: string) => unlockWithPin(pin))
  ipcMain.handle('security:begin-recovery-reset', (_event, payload: RecoveryResetPayload) => beginRecoveryReset(payload))
  ipcMain.handle('security:simulate-idle-lock', () => sessionLock.lock(window, 'idle'))
  ipcMain.handle('security:simulate-system-lock', () => sessionLock.lock(window, 'system'))

  ipcMain.handle('walnut:changePin', (_event, input: ChangePinInput) => changePin(input.currentPin, input.newPin))

  ipcMain.handle('walnut:clearTransactions', () => repository.clearTransactionsAndAudit())

  ipcMain.handle('walnut:fullReset', () => repository.fullAppReset())

  window.webContents.on('did-finish-load', () => {
    const current = repository.loadAppState()
    if (current.currentView === 'locked') {
      void sessionLock.lock(window, 'launch')
    }
  })
}
