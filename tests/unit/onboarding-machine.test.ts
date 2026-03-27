import { describe, expect, it } from 'vitest'
import { advanceOnboarding, getResumeStep, onboardingSteps } from '../../src/renderer/features/onboarding/onboardingMachine'

describe('onboarding machine', () => {
  it('keeps the six-step order stable', () => {
    expect(onboardingSteps).toEqual([
      'welcome',
      'household-profile',
      'pin-setup',
      'recovery-key',
      'account-profile',
      'finish'
    ])
  })

  it('resumes at the last incomplete step', () => {
    expect(
      getResumeStep({
        currentStep: 'recovery-key',
        completedSteps: ['welcome', 'household-profile', 'pin-setup'],
        recoveryConfirmed: false,
        recoverySavedToDevice: false
      })
    ).toBe('recovery-key')
  })

  it('advances while retaining household data', () => {
    const next = advanceOnboarding({
      current: {
        currentStep: 'household-profile',
        completedSteps: ['welcome'],
        profile: { householdName: 'Walnut Home', ownerName: 'Bit' },
        recoveryConfirmed: false,
        recoverySavedToDevice: false
      }
    })

    expect(next.currentStep).toBe('pin-setup')
    expect(next.profile?.householdName).toBe('Walnut Home')
  })
})
