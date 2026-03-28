import { ipcMain } from 'electron'
import type { AccountProfileDraft } from '../../shared/contracts/account'
import type { CompleteOnboardingInput, SaveOnboardingProgressInput } from '../../shared/contracts/app-state'
import { generateRecoveryKey } from '../../shared/security-utils'
import { getWalnutRepository } from '../persistence/db'
import { setupSecuritySecrets } from '../security/pin-service'

export const registerAppStateIpc = () => {
  const repository = getWalnutRepository()

  ipcMain.handle('app-state:load', () => repository.loadAppState())
  ipcMain.handle('app-state:ping', () => 'pong')
  ipcMain.handle('app-state:save-onboarding-progress', (_event, input: SaveOnboardingProgressInput) => repository.saveOnboardingProgress(input))
  ipcMain.handle('app-state:start-new-profile-setup', () => repository.startNewProfileSetup())
  ipcMain.handle('app-state:switch-device-profile', (_event, profileId: string) => repository.switchDeviceProfile(profileId))
  ipcMain.handle('app-state:save-account-profile', (_event, draft: AccountProfileDraft) => repository.saveAccountProfile(draft))
  ipcMain.handle('app-state:copy-recovery-ack', () => repository.acknowledgeRecoverySaved())
  ipcMain.handle('app-state:download-recovery-ack', () => repository.acknowledgeRecoverySaved())
  ipcMain.handle('app-state:get-security-events', () => repository.getSecurityEvents())
  ipcMain.handle('app-state:complete-onboarding', async (_event, input: CompleteOnboardingInput) => {
    const recoveryKey = generateRecoveryKey()
    const secrets = await setupSecuritySecrets(input.pin, recoveryKey)
    const nextState = repository.completeOnboarding(input, secrets.pinHash, {
      code: secrets.recoveryCodeCiphertext,
      words: secrets.recoveryWordsCiphertext
    })

    return {
      ...nextState,
      onboarding: {
        ...nextState.onboarding,
        recoveryKey
      }
    }
  })
}
