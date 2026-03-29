import { useEffect, useRef, useState } from 'react'
import type { AppConfig, AppShellState } from '../../../shared/contracts/app-state'

export interface SettingsScreenProps {
  onRequirePinSetup?: () => void
  onFullReset?: (state: AppShellState) => void
}

type ExportState = 'idle' | 'exporting' | 'done' | 'error'
type ChangePinState = 'idle' | 'submitting' | 'success' | 'error'
type BackupState = 'idle' | 'pin-prompt' | 'working' | 'success' | 'error'
type RestoreState = 'idle' | 'pin-prompt' | 'working' | 'success' | 'error'

function applyTheme(theme: 'light' | 'dark' | 'system') {
  const html = document.documentElement
  if (theme === 'light') html.setAttribute('data-theme', 'light')
  else if (theme === 'dark') html.setAttribute('data-theme', 'dark')
  else html.removeAttribute('data-theme')
}

const TIMEOUT_OPTIONS = [
  { label: '5 minutes', value: 300000 },
  { label: '15 minutes', value: 900000 },
  { label: '30 minutes', value: 1800000 },
  { label: 'Never', value: 0 }
]

export const SettingsScreen = ({ onRequirePinSetup, onFullReset }: SettingsScreenProps) => {
  // Diagnostics (existing Support section)
  const [redactedExportState, setRedactedExportState] = useState<ExportState>('idle')
  const [fullExportState, setFullExportState] = useState<ExportState>('idle')

  // App config
  const [config, setConfig] = useState<AppConfig>({
    theme: 'system',
    idleLockTimeoutMs: 900000,
    featureFlags: { aiSummaries: false }
  })

  // Change PIN state
  const [changePinExpanded, setChangePinExpanded] = useState(false)
  const [changePinState, setChangePinState] = useState<ChangePinState>('idle')
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [changePinError, setChangePinError] = useState('')
  const [newPinError, setNewPinError] = useState('')
  const currentPinRef = useRef<HTMLInputElement>(null)

  // Backup state
  const [backupState, setBackupState] = useState<BackupState>('idle')
  const [backupPinInput, setBackupPinInput] = useState('')
  const [backupError, setBackupError] = useState('')

  // Restore state
  const [restoreState, setRestoreState] = useState<RestoreState>('idle')
  const [restorePinInput, setRestorePinInput] = useState('')
  const [restoreError, setRestoreError] = useState('')

  // Feature flags
  const [aiSummaries, setAiSummaries] = useState(false)

  // Danger Zone — Clear Transactions
  const [showClearModal, setShowClearModal] = useState(false)
  const [clearState, setClearState] = useState<'idle' | 'working' | 'success'>('idle')
  const [clearSuccessMsg, setClearSuccessMsg] = useState('')
  const clearKeepBtnRef = useRef<HTMLButtonElement>(null)

  // Danger Zone — Full Reset
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [resetState, setResetState] = useState<'idle' | 'working'>('idle')
  const resetCancelBtnRef = useRef<HTMLButtonElement>(null)

  // Load config on mount
  useEffect(() => {
    void window.walnut.getAppConfig().then((cfg) => {
      setConfig(cfg)
      setAiSummaries(cfg.featureFlags.aiSummaries)
    })
  }, [])

  // Focus management: focus first input when change PIN expands
  useEffect(() => {
    if (changePinExpanded && currentPinRef.current) {
      currentPinRef.current.focus()
    }
  }, [changePinExpanded])

  // Focus safe button when modals open
  useEffect(() => {
    if (showClearModal && clearKeepBtnRef.current) {
      clearKeepBtnRef.current.focus()
    }
  }, [showClearModal])

  useEffect(() => {
    if (showResetModal && resetCancelBtnRef.current) {
      resetCancelBtnRef.current.focus()
    }
  }, [showResetModal])

  // Keyboard: Escape closes modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showClearModal) setShowClearModal(false)
        if (showResetModal) {
          setShowResetModal(false)
          setResetConfirmText('')
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showClearModal, showResetModal])

  // Ctrl+S in change PIN card submits
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's' && changePinExpanded) {
        e.preventDefault()
        if (isChangePinValid()) {
          void handleChangePin()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changePinExpanded, currentPin, newPin, confirmPin])

  const handleExport = async (type: 'redacted' | 'full', setState: (s: ExportState) => void) => {
    setState('exporting')
    try {
      const bundle = await window.walnut.generateDiagnosticsBundle({ type })
      const blob = new Blob([bundle], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const filename = `walnut-diagnostics-${type}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.click()
      URL.revokeObjectURL(url)
      setState('done')
      setTimeout(() => setState('idle'), 3000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 4000)
    }
  }

  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    const updated = await window.walnut.setAppConfig({ theme })
    setConfig(updated)
    applyTheme(theme)
  }

  const handleTimeoutChange = async (value: number) => {
    const updated = await window.walnut.setAppConfig({ idleLockTimeoutMs: value })
    setConfig(updated)
  }

  const isChangePinValid = () =>
    currentPin.length >= 6 && newPin.length >= 6 && newPin === confirmPin

  const validateChangePinFields = () => {
    let valid = true
    setChangePinError('')
    setNewPinError('')
    if (newPin.length > 0 && newPin.length < 6) {
      setNewPinError('PIN must be at least 6 digits.')
      valid = false
    }
    if (confirmPin.length > 0 && newPin !== confirmPin) {
      setNewPinError('New PIN and confirmation do not match.')
      valid = false
    }
    return valid
  }

  const handleChangePin = async () => {
    if (!isChangePinValid()) return
    setChangePinState('submitting')
    setChangePinError('')
    try {
      const result = await window.walnut.changePin({ currentPin, newPin })
      if (result.ok) {
        setChangePinState('success')
        setCurrentPin('')
        setNewPin('')
        setConfirmPin('')
        setTimeout(() => {
          setChangePinState('idle')
          setChangePinExpanded(false)
        }, 3000)
      } else {
        setChangePinState('error')
        setChangePinError(result.error ?? 'Current PIN is incorrect.')
      }
    } catch {
      setChangePinState('error')
      setChangePinError('Something went wrong. Try again.')
    }
  }

  const handleCreateBackup = async () => {
    if (backupState === 'pin-prompt') {
      if (!backupPinInput) return
      setBackupState('working')
      setBackupError('')
      try {
        const result = await window.walnut.exportBackup(backupPinInput)
        if (result.ok) {
          setBackupState('success')
          setBackupPinInput('')
          setTimeout(() => setBackupState('idle'), 3000)
        } else {
          setBackupState('error')
          setBackupError(result.error ?? 'Backup failed. Check available disk space and try again.')
          setTimeout(() => setBackupState('pin-prompt'), 3000)
        }
      } catch {
        setBackupState('error')
        setBackupError('Backup failed. Check available disk space and try again.')
        setTimeout(() => setBackupState('pin-prompt'), 3000)
      }
    } else {
      setBackupState('pin-prompt')
      setBackupPinInput('')
      setBackupError('')
    }
  }

  const handleRestoreBackup = async () => {
    if (restoreState === 'pin-prompt') {
      if (!restorePinInput) return
      setRestoreState('working')
      setRestoreError('')
      try {
        const result = await window.walnut.importBackup(restorePinInput)
        if (result.ok) {
          setRestoreState('success')
          setRestorePinInput('')
          setTimeout(() => {
            setRestoreState('idle')
            onRequirePinSetup?.()
          }, 2000)
        } else {
          setRestoreState('error')
          setRestoreError(result.error ?? 'Wrong PIN or corrupted backup file. Check the file and try again.')
          setTimeout(() => setRestoreState('pin-prompt'), 3000)
        }
      } catch {
        setRestoreState('error')
        setRestoreError('Wrong PIN or corrupted backup file. Check the file and try again.')
        setTimeout(() => setRestoreState('pin-prompt'), 3000)
      }
    } else {
      setRestoreState('pin-prompt')
      setRestorePinInput('')
      setRestoreError('')
    }
  }

  const handleAiSummariesToggle = async () => {
    const next = !aiSummaries
    setAiSummaries(next)
    const updated = await window.walnut.setAppConfig({ featureFlags: { aiSummaries: next } })
    setConfig(updated)
  }

  const handleClearTransactions = async () => {
    setClearState('working')
    try {
      const result = await window.walnut.clearTransactions()
      setClearSuccessMsg(`Cleared ${result.deletedCount} transactions.`)
      setClearState('success')
      setTimeout(() => {
        setClearState('idle')
        setShowClearModal(false)
      }, 3000)
    } catch {
      setClearState('idle')
      setShowClearModal(false)
    }
  }

  const handleFullReset = async () => {
    if (resetConfirmText !== 'RESET') return
    setResetState('working')
    try {
      const state = await window.walnut.fullReset()
      setShowResetModal(false)
      setResetConfirmText('')
      setResetState('idle')
      onFullReset?.(state)
    } catch {
      setResetState('idle')
    }
  }

  const sectionSeparator = (
    <div
      style={{
        borderTop: '1px solid var(--color-border)',
        paddingTop: 'var(--space-xl)'
      }}
    />
  )

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>Settings</h1>
        <p style={styles.pageSubtitle}>Configure preferences, security, backup, and support tools.</p>
      </div>

      {/* ===== SECTION 1: PREFERENCES ===== */}
      <section style={styles.section} aria-labelledby="prefs-heading">
        <h2 id="prefs-heading" style={styles.sectionHeading}>Preferences</h2>

        {/* Theme Toggle */}
        <div style={styles.fieldGroup}>
          <label style={styles.fieldLabel}>Theme</label>
          <div style={styles.segmentedGroup} role="group" aria-label="Theme selection">
            {(['light', 'dark', 'system'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                aria-pressed={config.theme === opt}
                style={{
                  ...styles.segmentButton,
                  ...(config.theme === opt ? styles.segmentButtonActive : styles.segmentButtonInactive)
                }}
                onClick={() => void handleThemeChange(opt)}
                onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-accent)'; e.currentTarget.style.outlineOffset = '2px' }}
                onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
              >
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Idle-lock timeout */}
        <div style={styles.fieldGroup}>
          <label htmlFor="idle-timeout" style={styles.fieldLabel}>Lock after inactivity</label>
          <select
            id="idle-timeout"
            value={config.idleLockTimeoutMs}
            onChange={(e) => void handleTimeoutChange(Number(e.target.value))}
            style={styles.selectControl}
            onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-accent)'; e.currentTarget.style.outlineOffset = '2px' }}
            onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
          >
            {TIMEOUT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p style={styles.helperText}>The app will lock itself after this period of keyboard and mouse inactivity.</p>
        </div>
      </section>

      {sectionSeparator}

      {/* ===== SECTION 2: SECURITY ===== */}
      <section style={styles.section} aria-labelledby="security-heading">
        <h2 id="security-heading" style={styles.sectionHeading}>Security</h2>

        {/* Change PIN action card */}
        <div style={styles.actionCard}>
          <div style={styles.actionCardContent}>
            <h3 style={styles.actionLabel}>Change PIN</h3>
            <p style={styles.actionDescription}>Update your 6+ digit numeric PIN.</p>
          </div>
          {!changePinExpanded && (
            <button
              type="button"
              style={{ ...styles.button, ...styles.buttonSecondary }}
              onClick={() => setChangePinExpanded(true)}
              onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-accent)'; e.currentTarget.style.outlineOffset = '2px' }}
              onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
            >
              Change PIN
            </button>
          )}
        </div>

        {changePinExpanded && (
          <div style={styles.expandedCard}>
            {changePinState === 'success' ? (
              <p style={styles.successText} aria-live="polite">PIN updated successfully</p>
            ) : (
              <>
                <div style={styles.inputGroup}>
                  <label htmlFor="current-pin" style={styles.inputLabel}>Current PIN</label>
                  <input
                    ref={currentPinRef}
                    id="current-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    minLength={6}
                    value={currentPin}
                    onChange={(e) => { setCurrentPin(e.target.value); setChangePinError('') }}
                    style={styles.pinInput}
                    onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-accent)'; e.currentTarget.style.outlineOffset = '2px' }}
                    onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
                  />
                  {changePinError && (
                    <p style={styles.errorText}>{changePinError}</p>
                  )}
                </div>

                <div style={styles.inputGroup}>
                  <label htmlFor="new-pin" style={styles.inputLabel}>New PIN</label>
                  <input
                    id="new-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    minLength={6}
                    value={newPin}
                    onChange={(e) => { setNewPin(e.target.value); setNewPinError('') }}
                    onBlur={validateChangePinFields}
                    style={styles.pinInput}
                    onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-accent)'; e.currentTarget.style.outlineOffset = '2px' }}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label htmlFor="confirm-pin" style={styles.inputLabel}>Confirm New PIN</label>
                  <input
                    id="confirm-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    minLength={6}
                    value={confirmPin}
                    onChange={(e) => { setConfirmPin(e.target.value); setNewPinError('') }}
                    onBlur={validateChangePinFields}
                    style={styles.pinInput}
                    onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-accent)'; e.currentTarget.style.outlineOffset = '2px' }}
                  />
                  {newPinError && (
                    <p style={styles.errorText}>{newPinError}</p>
                  )}
                </div>

                <div style={styles.rowButtons}>
                  <button
                    type="button"
                    style={{
                      ...styles.button,
                      ...styles.buttonPrimary,
                      ...((!isChangePinValid() || changePinState === 'submitting') ? styles.buttonDisabled : {})
                    }}
                    disabled={!isChangePinValid() || changePinState === 'submitting'}
                    onClick={() => void handleChangePin()}
                    onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-accent)'; e.currentTarget.style.outlineOffset = '2px' }}
                    onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
                  >
                    {changePinState === 'submitting' ? 'Updating PIN...' : 'Update PIN'}
                  </button>
                  <button
                    type="button"
                    style={{ ...styles.button, ...styles.buttonSecondary }}
                    onClick={() => {
                      setChangePinExpanded(false)
                      setCurrentPin('')
                      setNewPin('')
                      setConfirmPin('')
                      setChangePinError('')
                      setNewPinError('')
                      setChangePinState('idle')
                    }}
                    onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-accent)'; e.currentTarget.style.outlineOffset = '2px' }}
                    onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Recovery key note */}
        <div style={styles.noteCard} role="note">
          <p style={styles.noteText}>
            Your recovery key was created during onboarding. If you lose your PIN, use the recovery key on the lock screen to reset it.
          </p>
        </div>
      </section>

      {sectionSeparator}

      {/* ===== SECTION 3: BACKUP ===== */}
      <section style={styles.section} aria-labelledby="backup-heading">
        <h2 id="backup-heading" style={styles.sectionHeading}>Backup</h2>

        <div style={styles.actionGroup}>
          {/* Create Backup */}
          <div style={{ ...styles.actionCard, flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-lg)' }}>
              <div style={styles.actionCardContent}>
                <h3 style={styles.actionLabel}>Create Backup</h3>
                <p style={styles.actionDescription}>Saves an AES-256 encrypted backup of your data. Use your current PIN to decrypt it.</p>
              </div>
              {backupState === 'idle' && (
                <button
                  type="button"
                  style={{ ...styles.button, ...styles.buttonPrimary }}
                  onClick={() => void handleCreateBackup()}
                  onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-accent)'; e.currentTarget.style.outlineOffset = '2px' }}
                  onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
                >
                  Create Backup
                </button>
              )}
            </div>

            {backupState === 'pin-prompt' && (
              <div style={styles.inlineForm}>
                <label htmlFor="backup-pin" style={styles.inputLabel}>Enter your current PIN to encrypt the backup</label>
                <div style={styles.rowButtons}>
                  <input
                    id="backup-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={backupPinInput}
                    onChange={(e) => setBackupPinInput(e.target.value)}
                    style={styles.pinInput}
                    onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-accent)'; e.currentTarget.style.outlineOffset = '2px' }}
                    onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
                  />
                  <button
                    type="button"
                    style={{ ...styles.button, ...styles.buttonPrimary, ...((!backupPinInput) ? styles.buttonDisabled : {}) }}
                    disabled={!backupPinInput}
                    onClick={() => void handleCreateBackup()}
                    onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-accent)'; e.currentTarget.style.outlineOffset = '2px' }}
                    onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
                  >
                    Encrypt and Save
                  </button>
                  <button
                    type="button"
                    style={{ ...styles.button, ...styles.buttonSecondary }}
                    onClick={() => setBackupState('idle')}
                    onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-accent)'; e.currentTarget.style.outlineOffset = '2px' }}
                    onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
                  >
                    Cancel
                  </button>
                </div>
                {backupError && <p style={styles.errorText}>{backupError}</p>}
              </div>
            )}

            {backupState === 'working' && (
              <p style={styles.mutedText} aria-live="polite">Creating backup...</p>
            )}

            {backupState === 'success' && (
              <p style={styles.successText} aria-live="polite">Backup saved.</p>
            )}

            {backupState === 'error' && (
              <p style={styles.errorText} aria-live="polite">{backupError || 'Backup failed. Check available disk space and try again.'}</p>
            )}
          </div>

          {/* Restore from Backup */}
          <div style={{ ...styles.actionCard, flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-lg)' }}>
              <div style={styles.actionCardContent}>
                <h3 style={styles.actionLabel}>Restore from Backup</h3>
                <p style={styles.actionDescription}>Import a .wbk backup file. You will need the PIN used when the backup was created.</p>
              </div>
              {restoreState === 'idle' && (
                <button
                  type="button"
                  style={{ ...styles.button, ...styles.buttonSecondary }}
                  onClick={() => void handleRestoreBackup()}
                  onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-accent)'; e.currentTarget.style.outlineOffset = '2px' }}
                  onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
                >
                  Restore from Backup
                </button>
              )}
            </div>

            {restoreState === 'pin-prompt' && (
              <div style={styles.inlineForm}>
                <label htmlFor="restore-pin" style={styles.inputLabel}>Enter the PIN used when the backup was created</label>
                <div style={styles.rowButtons}>
                  <input
                    id="restore-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={restorePinInput}
                    onChange={(e) => setRestorePinInput(e.target.value)}
                    style={styles.pinInput}
                    onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-accent)'; e.currentTarget.style.outlineOffset = '2px' }}
                    onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
                  />
                  <button
                    type="button"
                    style={{ ...styles.button, ...styles.buttonSecondary, ...((!restorePinInput) ? styles.buttonDisabled : {}) }}
                    disabled={!restorePinInput}
                    onClick={() => void handleRestoreBackup()}
                    onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-accent)'; e.currentTarget.style.outlineOffset = '2px' }}
                    onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    style={{ ...styles.button, ...styles.buttonSecondary }}
                    onClick={() => setRestoreState('idle')}
                    onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-accent)'; e.currentTarget.style.outlineOffset = '2px' }}
                    onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
                  >
                    Cancel
                  </button>
                </div>
                {restoreError && <p style={styles.errorText}>{restoreError}</p>}
              </div>
            )}

            {restoreState === 'working' && (
              <p style={styles.mutedText} aria-live="polite">Restoring backup...</p>
            )}

            {restoreState === 'success' && (
              <p style={styles.successText} aria-live="polite">Backup restored. Set a new PIN to continue.</p>
            )}

            {restoreState === 'error' && (
              <p style={styles.errorText} aria-live="polite">{restoreError || 'Wrong PIN or corrupted backup file. Check the file and try again.'}</p>
            )}
          </div>
        </div>

        {/* Backup warning note */}
        <div
          style={{
            ...styles.noteCard,
            borderLeft: '3px solid rgba(180, 35, 24, 0.20)'
          }}
          role="note"
        >
          <p style={styles.noteText}>
            Backup files contain all your transaction data. They are owner-only and not safe to share externally. Use the redacted diagnostics bundle for support requests.
          </p>
        </div>
      </section>

      {sectionSeparator}

      {/* ===== SECTION 4: SUPPORT (existing, repositioned) ===== */}
      <section style={styles.section} aria-labelledby="support-heading">
        <h2 id="support-heading" style={styles.sectionHeading}>Support</h2>
        <p style={styles.sectionDescription}>
          Generate a diagnostics bundle to share with support when reporting an issue. The redacted bundle removes all
          transaction descriptions, references, and tags — safe to share externally.
        </p>

        <div style={styles.actionGroup}>
          <div style={styles.actionCard}>
            <div style={styles.actionCardContent}>
              <h3 style={styles.actionLabel}>Export Redacted Diagnostics</h3>
              <p style={styles.actionDescription}>
                Strips all sensitive text (descriptions, references, tags). Safe to share with support or attach to a
                bug report.
              </p>
            </div>
            <button
              type="button"
              style={{
                ...styles.button,
                ...(redactedExportState === 'exporting' ? styles.buttonDisabled : styles.buttonPrimary)
              }}
              disabled={redactedExportState === 'exporting'}
              onClick={() => void handleExport('redacted', setRedactedExportState)}
              aria-label="Export redacted diagnostics bundle"
              onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-accent)'; e.currentTarget.style.outlineOffset = '2px' }}
              onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
            >
              {redactedExportState === 'exporting'
                ? 'Exporting\u2026'
                : redactedExportState === 'done'
                  ? 'Exported'
                  : redactedExportState === 'error'
                    ? 'Export failed — try again'
                    : 'Export Redacted Diagnostics'}
            </button>
          </div>

          <div style={styles.actionCard}>
            <div style={styles.actionCardContent}>
              <h3 style={styles.actionLabel}>Export Full Diagnostics</h3>
              <p style={styles.actionDescription}>
                Includes all transaction data, category assignments, and the full audit ledger. Use only when directed
                by support and sharing in a trusted context.
              </p>
            </div>
            <button
              type="button"
              style={{
                ...styles.button,
                ...(fullExportState === 'exporting' ? styles.buttonDisabled : styles.buttonSecondary)
              }}
              disabled={fullExportState === 'exporting'}
              onClick={() => void handleExport('full', setFullExportState)}
              aria-label="Export full diagnostics bundle"
              onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-accent)'; e.currentTarget.style.outlineOffset = '2px' }}
              onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
            >
              {fullExportState === 'exporting'
                ? 'Exporting\u2026'
                : fullExportState === 'done'
                  ? 'Exported'
                  : fullExportState === 'error'
                    ? 'Export failed — try again'
                    : 'Export Full Diagnostics'}
            </button>
          </div>
        </div>

        <div style={styles.crashLogNote} role="note">
          <p style={styles.crashLogNoteHeading}>Crash logs</p>
          <p style={styles.crashLogNoteBody}>
            Application crash logs are silently retained in your local user data folder at{' '}
            <code style={styles.crashLogPath}>{'{userData}/logs/walnut.log'}</code>. These logs never leave your device
            unless you choose to share them.
          </p>
        </div>
      </section>

      {sectionSeparator}

      {/* ===== SECTION 5: LAB (Feature Flags) ===== */}
      <section style={styles.section} aria-labelledby="lab-heading">
        <h2 id="lab-heading" style={styles.sectionHeading}>Lab</h2>
        <p style={{ ...styles.sectionDescription, fontSize: 12 }}>
          Features in Lab are experimental and may change in future releases.
        </p>

        {/* AI Summaries toggle row */}
        <div style={styles.actionCard}>
          <div style={styles.actionCardContent}>
            <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--color-ink)' }}>AI Summaries</span>
            <p style={styles.actionDescription}>
              Show a narrative AI summary on the dashboard. Off by default. Requires an external AI service when enabled.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={aiSummaries}
            aria-label="Toggle AI Summaries"
            tabIndex={0}
            style={styles.toggleTrack(aiSummaries)}
            onClick={() => void handleAiSummariesToggle()}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                void handleAiSummariesToggle()
              }
            }}
            onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-accent)'; e.currentTarget.style.outlineOffset = '2px' }}
            onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
          >
            <span style={styles.toggleThumb(aiSummaries)} />
          </button>
        </div>
      </section>

      {sectionSeparator}

      {/* ===== SECTION 6: DANGER ZONE ===== */}
      <section
        style={{
          ...styles.section,
          borderLeft: '3px solid var(--color-destructive)',
          paddingLeft: 'var(--space-md)',
          background: 'rgba(180, 35, 24, 0.04)',
          borderRadius: 8,
          padding: 'var(--space-lg)'
        }}
        aria-labelledby="danger-heading"
      >
        <h2 id="danger-heading" style={{ ...styles.sectionHeading, color: 'var(--color-destructive)' }}>Danger Zone</h2>

        <div style={styles.actionGroup}>
          {/* Clear Transactions */}
          <div style={styles.actionCard}>
            <div style={styles.actionCardContent}>
              <h3 style={styles.actionLabel}>Clear Transactions</h3>
              <p style={styles.actionDescription}>
                Permanently deletes all transaction records and their associated audit events. Your categories, rules, and account profile are kept.
              </p>
            </div>
            <button
              type="button"
              style={{ ...styles.button, ...styles.buttonDestructive }}
              onClick={() => setShowClearModal(true)}
              onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-destructive)'; e.currentTarget.style.outlineOffset = '2px' }}
              onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
            >
              Clear Transactions
            </button>
          </div>

          {/* Full App Reset */}
          <div style={styles.actionCard}>
            <div style={styles.actionCardContent}>
              <h3 style={styles.actionLabel}>Full App Reset</h3>
              <p style={styles.actionDescription}>
                Wipes everything and returns the app to first-run onboarding. This cannot be undone.
              </p>
            </div>
            <button
              type="button"
              style={{ ...styles.button, ...styles.buttonDestructive }}
              onClick={() => setShowResetModal(true)}
              onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-destructive)'; e.currentTarget.style.outlineOffset = '2px' }}
              onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
            >
              Reset App
            </button>
          </div>
        </div>
      </section>

      {/* ===== CLEAR TRANSACTIONS MODAL ===== */}
      {showClearModal && (
        <div
          style={styles.modalBackdrop}
          onClick={(e) => { if (e.target === e.currentTarget) setShowClearModal(false) }}
        >
          <div
            style={styles.modalBox}
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-txn-title"
          >
            <h2 id="clear-txn-title" style={styles.modalTitle}>Clear all transactions?</h2>
            <p style={styles.modalBody}>
              This cannot be undone. Your categories, rules, and profile will not be affected.
            </p>
            {clearState === 'success' && (
              <p style={styles.successText} aria-live="polite">{clearSuccessMsg}</p>
            )}
            <div style={styles.modalButtons}>
              <button
                ref={clearKeepBtnRef}
                type="button"
                style={{ ...styles.button, ...styles.buttonSecondary }}
                onClick={() => setShowClearModal(false)}
                onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-accent)'; e.currentTarget.style.outlineOffset = '2px' }}
                onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
              >
                Keep Transactions
              </button>
              <button
                type="button"
                style={{
                  ...styles.button,
                  ...styles.buttonDestructive,
                  ...(clearState === 'working' ? styles.buttonDisabled : {})
                }}
                disabled={clearState === 'working'}
                onClick={() => void handleClearTransactions()}
                onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-destructive)'; e.currentTarget.style.outlineOffset = '2px' }}
                onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
              >
                {clearState === 'working' ? 'Clearing...' : 'Clear Transactions'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== FULL RESET MODAL ===== */}
      {showResetModal && (
        <div
          style={styles.modalBackdrop}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowResetModal(false); setResetConfirmText('') } }}
        >
          <div
            style={styles.modalBox}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <h2 id="reset-title" style={styles.modalTitle}>Full App Reset</h2>
            <p id="reset-instruction" style={styles.modalBody}>
              Type RESET to permanently wipe all data and return to onboarding.
            </p>
            <input
              type="text"
              aria-label="Type RESET to confirm"
              aria-describedby="reset-instruction"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              style={styles.pinInput}
              placeholder="RESET"
              onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-accent)'; e.currentTarget.style.outlineOffset = '2px' }}
              onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
            />
            <div style={styles.modalButtons}>
              <button
                ref={resetCancelBtnRef}
                type="button"
                style={{ ...styles.button, ...styles.buttonSecondary }}
                onClick={() => { setShowResetModal(false); setResetConfirmText('') }}
                onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-accent)'; e.currentTarget.style.outlineOffset = '2px' }}
                onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{
                  ...styles.button,
                  ...styles.buttonDestructive,
                  ...(resetConfirmText !== 'RESET' || resetState === 'working' ? styles.buttonDisabled : {})
                }}
                disabled={resetConfirmText !== 'RESET' || resetState === 'working'}
                onClick={() => void handleFullReset()}
                onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--color-destructive)'; e.currentTarget.style.outlineOffset = '2px' }}
                onBlur={(e) => { e.currentTarget.style.outline = ''; e.currentTarget.style.outlineOffset = '' }}
              >
                {resetState === 'working' ? 'Resetting...' : 'Reset App'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-xl)',
    padding: '0 var(--space-xl)',
    maxWidth: 720,
    margin: '0 auto',
    width: '100%'
  },
  header: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-xs)'
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 600,
    lineHeight: 1.2,
    margin: 0,
    color: 'var(--color-ink)'
  },
  pageSubtitle: {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.5,
    margin: 0,
    color: 'var(--color-muted)'
  },
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-lg)'
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1.3,
    margin: 0,
    color: 'var(--color-ink)'
  },
  sectionDescription: {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.5,
    margin: 0,
    color: 'var(--color-muted)'
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-xs)'
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--color-ink)',
    margin: 0
  },
  segmentedGroup: {
    display: 'flex',
    gap: 0
  },
  segmentButton: {
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1.4,
    cursor: 'pointer',
    border: '1px solid var(--color-border)',
    transition: 'background 0.15s, color 0.15s',
    borderRadius: 0
  } as React.CSSProperties,
  segmentButtonActive: {
    background: 'var(--color-accent)',
    color: '#fff',
    borderColor: 'var(--color-accent-strong)'
  },
  segmentButtonInactive: {
    background: 'var(--color-surface)',
    color: 'var(--color-ink)',
    border: '1px solid var(--color-border)'
  },
  selectControl: {
    padding: '8px 16px',
    borderRadius: 6,
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-ink)',
    fontSize: 14,
    cursor: 'pointer',
    width: '100%',
    maxWidth: 280
  },
  helperText: {
    fontSize: 12,
    fontWeight: 400,
    color: 'var(--color-muted)',
    margin: 0,
    lineHeight: 1.4
  },
  actionGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-md)'
  },
  actionCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-lg)',
    padding: 'var(--space-md)',
    borderRadius: 8,
    border: '1px solid rgba(30, 27, 22, 0.10)',
    background: 'var(--color-surface)'
  },
  actionCardContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-xs)',
    flex: 1,
    minWidth: 0
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1.4,
    margin: 0,
    color: 'var(--color-ink)'
  },
  actionDescription: {
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1.4,
    margin: 0,
    color: 'var(--color-muted)'
  },
  button: {
    padding: '8px 16px',
    borderRadius: 6,
    border: '1px solid',
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1.4,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
    transition: 'background 0.15s, color 0.15s, border-color 0.15s'
  },
  buttonPrimary: {
    background: 'var(--color-accent)',
    color: '#fff',
    borderColor: 'var(--color-accent-strong)'
  },
  buttonSecondary: {
    background: 'var(--color-bg)',
    color: 'var(--color-ink)',
    borderColor: 'rgba(30, 27, 22, 0.18)'
  },
  buttonDestructive: {
    background: 'var(--color-destructive)',
    color: '#fff',
    borderColor: 'var(--color-destructive)'
  },
  buttonDisabled: {
    background: 'var(--color-surface)',
    color: 'var(--color-muted)',
    borderColor: 'rgba(30, 27, 22, 0.10)',
    cursor: 'not-allowed'
  },
  expandedCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-md)',
    padding: 'var(--space-md)',
    borderRadius: 8,
    border: '1px solid rgba(30, 27, 22, 0.10)',
    background: 'var(--color-surface)'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-xs)'
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--color-ink)',
    margin: 0
  },
  pinInput: {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid var(--color-border)',
    background: 'var(--color-bg)',
    color: 'var(--color-ink)',
    fontSize: 14,
    width: '100%',
    maxWidth: 280
  },
  rowButtons: {
    display: 'flex',
    gap: 'var(--space-sm)',
    alignItems: 'center',
    flexWrap: 'wrap' as const
  },
  errorText: {
    fontSize: 12,
    color: 'var(--color-destructive)',
    margin: 0,
    lineHeight: 1.4
  },
  successText: {
    fontSize: 14,
    color: 'var(--color-accent)',
    margin: 0,
    fontWeight: 500
  },
  mutedText: {
    fontSize: 14,
    color: 'var(--color-muted)',
    margin: 0
  },
  inlineForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-sm)',
    paddingTop: 'var(--space-xs)'
  },
  noteCard: {
    padding: 'var(--space-md)',
    borderRadius: 8,
    border: '1px solid rgba(30, 27, 22, 0.08)',
    background: 'var(--color-surface)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-xs)'
  },
  noteText: {
    fontSize: 13,
    fontWeight: 400,
    lineHeight: 1.5,
    margin: 0,
    color: 'var(--color-muted)'
  },
  toggleTrack: (checked: boolean): React.CSSProperties => ({
    width: 40,
    height: 22,
    borderRadius: 11,
    background: checked ? 'var(--color-accent)' : 'var(--color-border)',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
    transition: 'background 0.15s',
    padding: 0
  }),
  toggleThumb: (checked: boolean): React.CSSProperties => ({
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#fff',
    position: 'absolute',
    left: 0,
    transform: `translateX(${checked ? 20 : 2}px)`,
    transition: 'transform 0.15s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
  }),
  crashLogNote: {
    padding: 'var(--space-md)',
    borderRadius: 8,
    border: '1px solid rgba(30, 27, 22, 0.08)',
    background: 'var(--color-surface)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-xs)'
  },
  crashLogNoteHeading: {
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1.4,
    margin: 0,
    color: 'var(--color-ink)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em'
  },
  crashLogNoteBody: {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.5,
    margin: 0,
    color: 'var(--color-muted)'
  },
  crashLogPath: {
    fontFamily: 'monospace',
    fontSize: 12,
    padding: '1px 4px',
    borderRadius: 3,
    background: 'rgba(30, 27, 22, 0.06)'
  },
  modalBackdrop: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalBox: {
    background: 'var(--color-surface)',
    borderRadius: 12,
    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
    padding: 'var(--space-xl)',
    maxWidth: 420,
    width: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-md)'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 600,
    margin: 0,
    color: 'var(--color-ink)'
  },
  modalBody: {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.5,
    margin: 0,
    color: 'var(--color-muted)'
  },
  modalButtons: {
    display: 'flex',
    gap: 'var(--space-sm)',
    justifyContent: 'flex-end',
    flexWrap: 'wrap' as const
  }
} as const
