import { useState } from 'react'
import { isValidPin } from '../../../../shared/security-utils'
import { ProgressSavedIndicator, stepStyles } from './WelcomeStep'

interface PinSetupStepProps {
  initialPin?: string
  onBack: () => void
  onNext: (pin: string) => void
}

export const PinSetupStep = ({ initialPin = '', onBack, onNext }: PinSetupStepProps) => {
  const [pin, setPin] = useState(initialPin)
  const [confirmPin, setConfirmPin] = useState(initialPin)
  const [error, setError] = useState('')

  const validate = () => {
    if (!isValidPin(pin)) return 'minimum 6 digits, numeric only'
    if (pin !== confirmPin) return 'PIN confirmation must match.'
    return ''
  }

  const submit = () => {
    const nextError = validate()
    setError(nextError)
    if (!nextError) onNext(pin)
  }

  return (
    <section style={stepStyles.section}>
      <div style={stepStyles.stepLabel}>Step 3 of 6</div>
      <h2 style={stepStyles.heading}>Set the device PIN for this household.</h2>
      <p style={stepStyles.body}>minimum 6 digits, numeric only</p>
      <div style={stepStyles.field}>
        <label htmlFor="pin-input">New PIN</label>
        <input
          id="pin-input"
          type="password"
          inputMode="numeric"
          style={stepStyles.input}
          value={pin}
          onBlur={() => setError(validate())}
          onChange={(event) => setPin(event.target.value)}
          onInput={(event) => setPin((event.target as HTMLInputElement).value)}
        />
      </div>
      <div style={stepStyles.field}>
        <label htmlFor="pin-confirm">Confirm PIN</label>
        <input
          id="pin-confirm"
          type="password"
          inputMode="numeric"
          style={stepStyles.input}
          value={confirmPin}
          onBlur={() => setError(validate())}
          onChange={(event) => setConfirmPin(event.target.value)}
          onInput={(event) => setConfirmPin((event.target as HTMLInputElement).value)}
        />
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
