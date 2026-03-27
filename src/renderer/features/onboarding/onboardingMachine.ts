import type {
  HouseholdProfile,
  OnboardingProgress,
  OnboardingStep,
  SaveOnboardingProgressInput
} from '../../../shared/contracts/app-state'
import type { AccountProfileDraft } from '../../../shared/contracts/account'
import type { RecoveryKeyMaterial } from '../../../shared/contracts/security'

export const onboardingSteps: OnboardingStep[] = [
  'welcome',
  'household-profile',
  'pin-setup',
  'recovery-key',
  'account-profile',
  'finish'
]

export const getStepIndex = (step: OnboardingStep) => onboardingSteps.indexOf(step)
export const getNextStep = (step: OnboardingStep) => onboardingSteps[Math.min(getStepIndex(step) + 1, onboardingSteps.length - 1)]
export const getPreviousStep = (step: OnboardingStep) => onboardingSteps[Math.max(getStepIndex(step) - 1, 0)]

export const getResumeStep = (progress: OnboardingProgress): OnboardingStep => {
  for (const step of onboardingSteps) {
    if (!progress.completedSteps.includes(step)) {
      return progress.currentStep === 'finish' ? step : progress.currentStep
    }
  }
  return progress.currentStep
}

export interface TransitionInput {
  current: OnboardingProgress
  householdProfile?: HouseholdProfile
  pin?: string
  recoveryKey?: RecoveryKeyMaterial
  accountDraft?: AccountProfileDraft
  markRecoverySaved?: boolean
}

export const advanceOnboarding = (input: TransitionInput): SaveOnboardingProgressInput => {
  const nextStep = getNextStep(input.current.currentStep)
  const completed = Array.from(new Set([...input.current.completedSteps, input.current.currentStep]))

  return {
    currentStep: nextStep,
    completedSteps: completed,
    profile: input.householdProfile ?? input.current.profile,
    draftPin: input.pin ?? input.current.draftPin,
    recoveryKey: input.recoveryKey ?? input.current.recoveryKey,
    recoveryConfirmed: input.markRecoverySaved || input.current.recoveryConfirmed,
    recoverySavedToDevice: input.markRecoverySaved || input.current.recoverySavedToDevice,
    accountDraft: input.accountDraft ?? input.current.accountDraft
  }
}

export const rewindOnboarding = (current: OnboardingProgress): SaveOnboardingProgressInput => ({
  ...current,
  currentStep: getPreviousStep(current.currentStep)
})
