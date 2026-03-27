import { useMemo, useState } from 'react'
import type { AppShellState, HouseholdProfile, OnboardingStep } from '../../../shared/contracts/app-state'
import type { AccountProfileDraft } from '../../../shared/contracts/account'
import type { RecoveryKeyMaterial } from '../../../shared/contracts/security'
import { generateRecoveryKey } from '../../../shared/security-utils'
import { AppShell } from '../app-shell/AppShell'
import { advanceOnboarding, getResumeStep, rewindOnboarding } from './onboardingMachine'
import { AccountProfileStep } from './steps/AccountProfileStep'
import { FinishStep } from './steps/FinishStep'
import { HouseholdProfileStep } from './steps/HouseholdProfileStep'
import { PinSetupStep } from './steps/PinSetupStep'
import { RecoveryKeyStep } from './steps/RecoveryKeyStep'
import { WelcomeStep, stepStyles } from './steps/WelcomeStep'

interface OnboardingFlowProps {
  state: AppShellState
  setState: (state: AppShellState) => void
}

export const OnboardingFlow = ({ state, setState }: OnboardingFlowProps) => {
  const [localRecoveryKey, setLocalRecoveryKey] = useState<RecoveryKeyMaterial | undefined>(state.onboarding.recoveryKey)
  const currentStep = useMemo(() => getResumeStep(state.onboarding), [state.onboarding])

  const getOrCreateRecoveryKey = () => {
    const existing = localRecoveryKey ?? state.onboarding.recoveryKey
    if (existing) {
      return existing
    }
    const nextKey = generateRecoveryKey()
    setLocalRecoveryKey(nextKey)
    return nextKey
  }

  const nextFromWelcome = async () => {
    const nextInput = advanceOnboarding({ current: state.onboarding })
    setState({
      ...state,
      onboarding: {
        ...state.onboarding,
        ...nextInput
      }
    })
    const nextState = await window.walnut.saveOnboardingProgress(nextInput)
    setState(nextState)
  }

  const saveAndAdvance = async (payload: { profile?: HouseholdProfile; pin?: string; accountDraft?: AccountProfileDraft; markRecoverySaved?: boolean }) => {
    const recoveryKey =
      currentStep === 'pin-setup' || currentStep === 'recovery-key' || currentStep === 'account-profile'
        ? getOrCreateRecoveryKey()
        : localRecoveryKey
    const nextInput = advanceOnboarding({
      current: state.onboarding,
      householdProfile: payload.profile,
      pin: payload.pin,
      recoveryKey,
      accountDraft: payload.accountDraft,
      markRecoverySaved: payload.markRecoverySaved
    })
    setState({
      ...state,
      onboarding: {
        ...state.onboarding,
        ...nextInput
      }
    })
    const nextState = await window.walnut.saveOnboardingProgress(nextInput)
    setState(nextState)
  }

  const goBack = async () => {
    const nextInput = rewindOnboarding(state.onboarding)
    setState({
      ...state,
      onboarding: {
        ...state.onboarding,
        ...nextInput
      }
    })
    const nextState = await window.walnut.saveOnboardingProgress(nextInput)
    setState(nextState)
  }

  const finishOnboarding = async () => {
    const nextState = await window.walnut.completeOnboarding({
      profile: state.onboarding.profile ?? { householdName: 'Walnut household', ownerName: 'Owner' },
      pin: state.onboarding.draftPin ?? '123456',
      accountDraft: state.onboarding.accountDraft?.skippedDuringOnboarding ? undefined : state.onboarding.accountDraft
    })
    setState(nextState)
  }

  const acknowledgeRecovery = async (mode: 'copy' | 'download') => {
    setState({
      ...state,
      onboarding: {
        ...state.onboarding,
        recoveryConfirmed: true,
        recoverySavedToDevice: true
      }
    })
    const nextState = mode === 'copy' ? await window.walnut.copyRecoveryKeyAcknowledged() : await window.walnut.downloadRecoveryKeyAcknowledged()
    setState(nextState)
  }

  const skipAccountSetup = async () => {
    const skippedDraft: AccountProfileDraft = {
      bankName: 'ICICI',
      displayName: '',
      accountHolderName: '',
      baseCurrency: 'INR',
      skippedDuringOnboarding: true
    }
    const nextState = await window.walnut.saveOnboardingProgress(
      advanceOnboarding({
        current: state.onboarding,
        accountDraft: skippedDraft,
        recoveryKey: localRecoveryKey
      })
    )
    setState(nextState)
  }

  const renderStep = (step: OnboardingStep) => {
    switch (step) {
      case 'welcome':
        return <WelcomeStep onNext={nextFromWelcome} />
      case 'household-profile':
        return <HouseholdProfileStep initialValue={state.onboarding.profile} onBack={goBack} onNext={(profile) => void saveAndAdvance({ profile })} />
      case 'pin-setup':
        return <PinSetupStep initialPin={state.onboarding.draftPin} onBack={goBack} onNext={(pin) => void saveAndAdvance({ pin })} />
      case 'recovery-key':
        return localRecoveryKey ? <RecoveryKeyStep recoveryKey={localRecoveryKey} confirmed={state.onboarding.recoverySavedToDevice} onBack={goBack} onAcknowledge={acknowledgeRecovery} onNext={() => void saveAndAdvance({ markRecoverySaved: true })} /> : <div style={stepStyles.helper}>Preparing recovery key...</div>
      case 'account-profile':
        return <AccountProfileStep initialValue={state.onboarding.accountDraft} onBack={goBack} onSkip={skipAccountSetup} onNext={(accountDraft) => void saveAndAdvance({ accountDraft })} />
      case 'finish':
        return <FinishStep profile={state.onboarding.profile} accountDraft={state.onboarding.accountDraft} onBack={goBack} onFinish={finishOnboarding} />
    }
  }

  return (
    <AppShell title="Secure your household finance workspace" eyebrow="Trusted local setup for statement analysis">
      <section aria-label="onboarding frame" style={{ width: 'min(100%, 1120px)', display: 'grid', justifyItems: 'center' }}>
        <div style={{ width: 'min(100%, 560px)', padding: 'var(--space-2xl)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', background: 'rgba(245, 241, 232, 0.72)', boxShadow: 'var(--shadow-panel)' }}>
          {renderStep(currentStep)}
        </div>
      </section>
    </AppShell>
  )
}
