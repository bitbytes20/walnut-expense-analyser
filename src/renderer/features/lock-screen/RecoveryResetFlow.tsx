import { useState } from 'react'
import { stepStyles } from '../onboarding/steps/WelcomeStep'

interface RecoveryResetFlowProps {
  onCancel: () => void
  onComplete: () => void
}

export const RecoveryResetFlow = ({ onCancel, onComplete }: RecoveryResetFlowProps) => {
  const [recoveryInput, setRecoveryInput] = useState('')
  const [newPin, setNewPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    try {
      setBusy(true)
      setError('')
      await window.walnut.beginRecoveryReset({
        recoveryInput,
        newPin
      })
      onComplete()
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to reset PIN.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section style={stepStyles.section}>
      <div style={stepStyles.stepLabel}>Recovery task</div>
      <h2 style={stepStyles.heading}>Reset access for this device owner.</h2>
      <p style={{ ...stepStyles.body, color: 'var(--color-destructive)' }}>
        Reset PIN with recovery key: This will replace the current PIN and issue a new recovery key for this device. Continue only if you have access to the old data owner context.
      </p>
      <div style={stepStyles.field}>
        <label htmlFor="recovery-input">Recovery key code or recovery words</label>
        <input id="recovery-input" style={stepStyles.input} value={recoveryInput} onChange={(event) => setRecoveryInput(event.target.value)} />
      </div>
      <div style={stepStyles.field}>
        <label htmlFor="new-pin">New PIN</label>
        <input id="new-pin" type="password" inputMode="numeric" style={stepStyles.input} value={newPin} onChange={(event) => setNewPin(event.target.value)} />
      </div>
      {error ? <div style={stepStyles.error}>{error}</div> : null}
      <div style={stepStyles.actions}>
        <button type="button" style={stepStyles.secondaryButton} onClick={onCancel}>Back</button>
        <button type="button" style={stepStyles.primaryButton} disabled={busy} onClick={submit}>{busy ? 'Resetting...' : 'Reset PIN'}</button>
      </div>
    </section>
  )
}
