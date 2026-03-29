import { useMemo, useState } from 'react'
import type { RecoveryKeyMaterial } from '../../../../shared/contracts/security'
import { ProgressSavedIndicator, stepStyles } from './WelcomeStep'

interface RecoveryKeyStepProps {
  recoveryKey: RecoveryKeyMaterial
  confirmed: boolean
  onBack: () => void
  onAcknowledge: (mode: 'copy' | 'download') => Promise<void>
  onNext: () => void
}

export const RecoveryKeyStep = ({ recoveryKey, confirmed, onBack, onAcknowledge, onNext }: RecoveryKeyStepProps) => {
  const [savingMode, setSavingMode] = useState<'copy' | 'download' | null>(null)
  const wordList = useMemo(() => recoveryKey.words.join(' '), [recoveryKey.words])

  const handleCopy = async () => {
    setSavingMode('copy')
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${recoveryKey.code}\n${wordList}`)
      } catch {
        // Browsers may block clipboard writes during automated tests or preview mode.
      }
    }
    await onAcknowledge('copy')
    setSavingMode(null)
  }

  const handleDownload = async () => {
    setSavingMode('download')
    const content = `Recovery code: ${recoveryKey.code}\nRecovery words: ${wordList}\n`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'walnut-recovery-key.txt'
    anchor.click()
    URL.revokeObjectURL(url)
    await onAcknowledge('download')
    setSavingMode(null)
  }

  return (
    <section style={stepStyles.section}>
      <div style={stepStyles.stepLabel}>Step 4 of 6</div>
      <h2 style={stepStyles.heading}>Save the one-time recovery key for this device.</h2>
      <div style={{ ...stepStyles.field, gap: 'var(--space-md)' }}>
        <div style={recoveryStyles.block}>
          <div style={recoveryStyles.label}>Recovery code</div>
          <div style={recoveryStyles.code}>{recoveryKey.code}</div>
        </div>
        <div style={recoveryStyles.block}>
          <div style={recoveryStyles.label}>Recovery words</div>
          <div style={recoveryStyles.words}>{wordList}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
        <button type="button" style={stepStyles.secondaryButton} onClick={handleCopy} disabled={savingMode !== null}>{savingMode === 'copy' ? 'Copying...' : 'Copy'}</button>
        <button type="button" style={stepStyles.secondaryButton} onClick={handleDownload} disabled={savingMode !== null}>{savingMode === 'download' ? 'Downloading...' : 'Download'}</button>
      </div>
      <label style={recoveryStyles.confirmation}>
        <input type="checkbox" checked={confirmed} readOnly />
        <span>I have saved it and it is not saved on this device.</span>
      </label>
      <div style={stepStyles.actions}>
        <button type="button" style={stepStyles.secondaryButton} onClick={onBack}>Back</button>
        <ProgressSavedIndicator />
        <button type="button" style={stepStyles.primaryButton} onClick={onNext} disabled={!confirmed}>Next</button>
      </div>
    </section>
  )
}

const recoveryStyles = {
  block: {
    padding: 'var(--space-lg)',
    borderRadius: 'var(--radius-md)',
    background: 'rgba(255,255,255,0.4)',
    border: '1px solid var(--color-border)'
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 'var(--space-sm)'
  },
  code: {
    letterSpacing: '0.12em',
    fontWeight: 600
  },
  words: {
    lineHeight: 1.7
  },
  confirmation: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)'
  }
}
