import { useEffect, useMemo, useState } from 'react'
import type { AppShellState } from '../../../shared/contracts/app-state'
import { AppShell } from '../app-shell/AppShell'
import { RecoveryResetFlow } from './RecoveryResetFlow'

interface LockScreenProps {
  state: AppShellState
  setState: (state: AppShellState) => void
}

export const LockScreen = ({ state, setState }: LockScreenProps) => {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [showRecoveryReset, setShowRecoveryReset] = useState(false)

  const accountLabel = useMemo(
    () => state.accountProfile?.displayName ?? state.security.lastUnlockedAccountLabel ?? 'Primary household account',
    [state.accountProfile?.displayName, state.security.lastUnlockedAccountLabel]
  )

  useEffect(() => {
    const pinField = document.getElementById('unlock-pin')
    pinField?.focus()
  }, [])

  const unlock = async () => {
    const result = await window.walnut.unlockWithPin(pin)
    if (!result.ok) {
      setError(result.message ?? "We couldn't verify that PIN. Check the digits and try again. If you're locked out, use your recovery key.")
      return
    }
    const latest = await window.walnut.loadAppState()
    setState({
      ...latest,
      currentView: 'dashboard'
    })
    setPin('')
    setError('')
  }

  if (showRecoveryReset) {
    return (
      <AppShell title="Recover this device" eyebrow="Local-only access recovery">
        <div style={styles.wrap}>
          <div style={styles.panel}>
            <RecoveryResetFlow
              onCancel={() => setShowRecoveryReset(false)}
              onComplete={async () => {
                const latest = await window.walnut.loadAppState()
                setState({
                  ...latest,
                  currentView: 'locked'
                })
                setShowRecoveryReset(false)
              }}
            />
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title={state.onboarding.profile?.householdName ?? 'Walnut household'} eyebrow="This workspace is locked">
      <div style={styles.wrap}>
        <div style={styles.contextCard}>
          <div style={styles.cardLabel}>Last unlocked account</div>
          <div style={styles.cardValue}>{accountLabel}</div>
          <div style={styles.cardHint}>Local household data remains on this device.</div>
        </div>
        <div style={styles.panel}>
          <div style={styles.stepLabel}>Unlock this device</div>
          <h2 style={styles.heading}>Enter the household PIN to continue.</h2>
          <label htmlFor="unlock-pin" style={styles.fieldLabel}>PIN</label>
          <input
            id="unlock-pin"
            type="password"
            inputMode="numeric"
            style={styles.input}
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void unlock()
              }
            }}
          />
          {error ? <div style={styles.error}>{error}</div> : null}
          <button type="button" style={styles.primaryButton} onClick={() => void unlock()}>
            {error.startsWith('Try again in') ? error : 'Unlock'}
          </button>
          <div style={styles.tertiaryLinks}>
            <button type="button" style={styles.tertiaryButton}>Restore from backup</button>
            <button type="button" style={styles.tertiaryButton} onClick={() => setShowRecoveryReset(true)}>Use recovery key</button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

const styles = {
  wrap: {
    width: 'min(100%, 1120px)',
    display: 'grid',
    gap: 'var(--space-xl)',
    alignItems: 'start',
    gridTemplateColumns: '320px minmax(0, 560px)'
  },
  contextCard: {
    padding: 'var(--space-xl)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(226, 215, 197, 0.72)',
    boxShadow: 'var(--shadow-panel)'
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-accent)'
  },
  cardValue: {
    marginTop: 'var(--space-md)',
    fontSize: 'var(--font-heading-size)',
    fontWeight: 600
  },
  cardHint: {
    marginTop: 'var(--space-sm)',
    color: 'var(--color-muted)'
  },
  panel: {
    padding: 'var(--space-2xl)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    background: 'rgba(245, 241, 232, 0.74)',
    boxShadow: 'var(--shadow-panel)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-md)'
  },
  stepLabel: {
    color: 'var(--color-accent)',
    fontWeight: 600,
    fontSize: 14
  },
  heading: {
    margin: 0,
    fontSize: 'var(--font-display-size)',
    lineHeight: 1.1
  },
  fieldLabel: {
    fontWeight: 600
  },
  input: {
    minHeight: 56,
    borderRadius: 18,
    border: '1px solid var(--color-border)',
    background: 'rgba(255,255,255,0.5)',
    color: 'inherit',
    padding: '0 16px'
  },
  error: {
    color: 'var(--color-destructive)',
    fontSize: 14
  },
  primaryButton: {
    minHeight: 56,
    border: 0,
    borderRadius: 999,
    background: 'var(--color-accent)',
    color: 'white',
    padding: '0 24px',
    fontWeight: 600
  },
  tertiaryLinks: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    gap: 'var(--space-sm)'
  },
  tertiaryButton: {
    border: 0,
    background: 'transparent',
    color: 'var(--color-muted)',
    padding: 0
  }
}
