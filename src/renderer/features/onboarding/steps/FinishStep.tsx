import type { AccountProfileDraft } from '../../../../shared/contracts/account'
import type { HouseholdProfile } from '../../../../shared/contracts/app-state'
import { ProgressSavedIndicator, stepStyles } from './WelcomeStep'

interface FinishStepProps {
  profile?: HouseholdProfile
  accountDraft?: AccountProfileDraft
  onBack: () => void
  onFinish: () => void
}

export const FinishStep = ({ profile, accountDraft, onBack, onFinish }: FinishStepProps) => (
  <section style={stepStyles.section}>
    <div style={stepStyles.stepLabel}>Step 6 of 6</div>
    <h2 style={stepStyles.heading}>Finish setup and enter the dashboard.</h2>
    <p style={stepStyles.body}>
      Household owner: <strong>{profile?.ownerName ?? 'Pending'}</strong>
      <br />
      Household name: <strong>{profile?.householdName ?? 'Pending'}</strong>
      <br />
      Account path: <strong>{accountDraft?.displayName ?? 'Create later from first import'}</strong>
    </p>
    <div style={stepStyles.actions}>
      <button type="button" style={stepStyles.secondaryButton} onClick={onBack}>Back</button>
      <ProgressSavedIndicator />
      <button type="button" style={stepStyles.primaryButton} onClick={onFinish}>Finish</button>
    </div>
  </section>
)
