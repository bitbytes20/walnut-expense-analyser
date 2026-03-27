import { useState } from 'react'
import type { HouseholdProfile } from '../../../../shared/contracts/app-state'
import { ProgressSavedIndicator, stepStyles } from './WelcomeStep'

interface HouseholdProfileStepProps {
  initialValue?: HouseholdProfile
  onBack: () => void
  onNext: (profile: HouseholdProfile) => void
}

export const HouseholdProfileStep = ({ initialValue, onBack, onNext }: HouseholdProfileStepProps) => {
  const [profile, setProfile] = useState<HouseholdProfile>(initialValue ?? { householdName: '', ownerName: '' })
  const [error, setError] = useState('')

  const submit = () => {
    if (!profile.householdName.trim() || !profile.ownerName.trim()) {
      setError('Enter both the household name and owner name to continue.')
      return
    }
    setError('')
    onNext(profile)
  }

  return (
    <section style={stepStyles.section}>
      <div style={stepStyles.stepLabel}>Step 2 of 6</div>
      <h2 style={stepStyles.heading}>Name the household and owner for this device.</h2>
      <div style={stepStyles.field}>
        <label htmlFor="household-name">Household name</label>
        <input id="household-name" style={stepStyles.input} value={profile.householdName} onChange={(event) => setProfile((current) => ({ ...current, householdName: event.target.value }))} />
      </div>
      <div style={stepStyles.field}>
        <label htmlFor="owner-name">Owner name</label>
        <input id="owner-name" style={stepStyles.input} value={profile.ownerName} onChange={(event) => setProfile((current) => ({ ...current, ownerName: event.target.value }))} />
      </div>
      {error ? <div style={stepStyles.error}>{error}</div> : null}
      <div style={stepStyles.actions}>
        <button type="button" style={stepStyles.secondaryButton} onClick={onBack}>Back</button>
        <ProgressSavedIndicator />
        <button type="button" style={stepStyles.primaryButton} onClick={submit}>Next</button>
      </div>
    </section>
  )
}
