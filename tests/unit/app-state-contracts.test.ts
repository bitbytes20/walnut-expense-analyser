import { describe, expect, it } from 'vitest'
import type { AccountProfileDraft } from '../../src/shared/contracts/account'
import { onboardingSteps } from '../../src/renderer/features/onboarding/onboardingMachine'

describe('app state contracts', () => {
  it('locks the onboarding steps to the agreed six-step order', () => {
    expect(onboardingSteps).toEqual([
      'welcome',
      'household-profile',
      'pin-setup',
      'recovery-key',
      'account-profile',
      'finish'
    ])
  })

  it('keeps openingBalance optional on the single-account ICICI draft', () => {
    const draft: AccountProfileDraft = {
      bankName: 'ICICI',
      displayName: 'Primary',
      accountHolderName: 'Owner',
      baseCurrency: 'INR'
    }

    expect(draft.bankName).toBe('ICICI')
    expect(draft.openingBalance).toBeUndefined()
  })
})
