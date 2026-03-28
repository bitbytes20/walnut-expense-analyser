import { ArrowRight, BadgePlus, DatabaseBackup, Eye, EyeOff, Landmark, LockKeyhole, ShieldCheck } from 'lucide-react'
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
  const [showPin, setShowPin] = useState(false)
  const [showRecoveryReset, setShowRecoveryReset] = useState(false)
  const [showNewProfilePrompt, setShowNewProfilePrompt] = useState(false)
  const [startingFreshProfile, setStartingFreshProfile] = useState(false)
  const [switchingProfileId, setSwitchingProfileId] = useState<string>()

  const accountLabel = useMemo(
    () => state.accountProfile?.displayName ?? state.security.lastUnlockedAccountLabel ?? 'Primary household account',
    [state.accountProfile?.displayName, state.security.lastUnlockedAccountLabel]
  )

  const ownerLabel = state.onboarding.profile?.ownerName ?? 'Walnut owner'
  const householdLabel = state.onboarding.profile?.householdName ?? 'Walnut household'
  const visibleProfiles = state.deviceProfiles

  useEffect(() => {
    const pinField = document.getElementById('unlock-pin')
    pinField?.focus()
  }, [state.activeProfileId])

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
    setShowPin(false)
  }

  const startNewProfile = async () => {
    setStartingFreshProfile(true)
    try {
      const latest = await window.walnut.startNewProfileSetup()
      setState({
        ...latest,
        currentView: 'onboarding'
      })
    } finally {
      setStartingFreshProfile(false)
    }
  }

  const switchProfile = async (profileId: string) => {
    if (profileId === state.activeProfileId) {
      return
    }

    setSwitchingProfileId(profileId)
    try {
      const latest = await window.walnut.switchDeviceProfile(profileId)
      setState({
        ...latest,
        currentView: 'locked'
      })
      setPin('')
      setError('')
      setShowPin(false)
      setShowNewProfilePrompt(false)
    } finally {
      setSwitchingProfileId(undefined)
    }
  }

  if (showRecoveryReset) {
    return (
      <AppShell title="Recover this device" eyebrow="Local-only access recovery">
        <div style={styles.recoveryWrap}>
          <div style={styles.recoveryPanel}>
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

  if (showNewProfilePrompt) {
    return (
      <AppShell title="Create a new local profile" eyebrow="Fresh setup on this device">
        <div style={styles.recoveryWrap}>
          <section style={styles.newProfileScreen}>
            <aside style={styles.newProfileAside}>
              <div style={styles.newProfileAsideBadge}>
                <BadgePlus size={18} />
              </div>
              <div style={styles.newProfileKicker}>Fresh setup</div>
              <h2 style={styles.newProfileAsideHeading}>Add another household to this device.</h2>
              <p style={styles.newProfileAsideBody}>
                Start a separate onboarding flow without removing the profiles that are already saved here.
              </p>
              <div style={styles.newProfileStat}>
                <span style={styles.newProfileStatLabel}>Saved locally</span>
                <strong style={styles.newProfileStatValue}>{visibleProfiles.length} profile{visibleProfiles.length === 1 ? '' : 's'}</strong>
              </div>
            </aside>

            <div style={styles.newProfileMain}>
              <div style={styles.newProfileMainHeader}>
                <div style={styles.newProfileKicker}>New local profile</div>
                <h3 style={styles.newProfileScreenHeading}>Start a new local profile on this device?</h3>
                <p style={styles.newProfileScreenBody}>
                  Walnut will open onboarding for a brand new household profile while keeping the existing local profiles available on the lock screen.
                </p>
              </div>

              <div style={styles.newProfileChecklist}>
                <div style={styles.newProfileChecklistItem}>
                  <span style={styles.newProfileChecklistTitle}>Existing profiles stay available</span>
                  <span style={styles.newProfileChecklistText}>You can switch back to any saved household from the lock screen later.</span>
                </div>
                <div style={styles.newProfileChecklistItem}>
                  <span style={styles.newProfileChecklistTitle}>Onboarding creates a separate profile</span>
                  <span style={styles.newProfileChecklistText}>The next setup flow becomes a new local household with its own PIN and history.</span>
                </div>
                <div style={styles.newProfileChecklistItem}>
                  <span style={styles.newProfileChecklistTitle}>Nothing is merged automatically</span>
                  <span style={styles.newProfileChecklistText}>The new profile starts clean, and existing local profiles remain unchanged.</span>
                </div>
              </div>

              <div style={styles.newProfileActions}>
                <button type="button" style={styles.secondaryButton} onClick={() => setShowNewProfilePrompt(false)}>
                  Back to lock screen
                </button>
                <button type="button" style={styles.dangerButton} onClick={() => void startNewProfile()} disabled={startingFreshProfile}>
                  {startingFreshProfile ? 'Starting fresh profile...' : 'Start new profile'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title={householdLabel} eyebrow="This workspace is locked">
      <div style={styles.layout}>
        <section style={styles.visualPanel}>
          <div style={styles.visualTop}>
            <div style={styles.visualBrand}>
              <div style={styles.visualBadge}>
                <Landmark size={22} strokeWidth={2.2} />
              </div>
              <div style={styles.visualCopy}>
                <div style={styles.visualEyebrow}>Walnut Expense Analyser</div>
                <h2 style={styles.visualHeading}>{ownerLabel}</h2>
                <p style={styles.visualBody}>This device stays private, local, and ready for the household owner to step back in.</p>
              </div>
            </div>
          </div>

          <div style={styles.visualCenter}>
            <div style={styles.heroFrame}>
              <div style={styles.heroWindow}>
                <div style={styles.heroSidebar} />
                <div style={styles.heroContent}>
                  <div style={styles.heroBars}>
                    <span style={styles.heroBarLong} />
                    <span style={styles.heroBarShort} />
                    <span style={styles.heroBarMedium} />
                  </div>
                  <div style={styles.heroCards}>
                    <div style={styles.heroCardPrimary} />
                    <div style={styles.heroCardSecondary} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.infoGrid}>
            <article style={styles.infoCard}>
              <div style={styles.infoIcon}>
                <ShieldCheck size={18} />
              </div>
              <div style={styles.infoLabel}>Last unlocked account</div>
              <div style={styles.infoValue}>{accountLabel}</div>
              <div style={styles.infoHint}>Local household data remains on this device.</div>
            </article>
            <article style={styles.infoCard}>
              <div style={styles.infoIcon}>
                <Landmark size={18} />
              </div>
              <div style={styles.infoLabel}>Saved profiles</div>
              <div style={styles.infoValue}>{visibleProfiles.length}</div>
              <div style={styles.infoHint}>Select any saved household from the profile list on the right and unlock with that PIN.</div>
            </article>
          </div>
        </section>

        <section style={styles.authPanel}>
          <div style={styles.profileStrip}>
            <div style={styles.profileStripHeader}>
              <div style={styles.profileStripKicker}>Local profiles on this device</div>
              <div style={styles.profileStripHint}>Choose a household profile first, then enter the matching PIN.</div>
            </div>
            <div style={styles.profileList} aria-label="Local profile list">
              {visibleProfiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  aria-pressed={profile.id === state.activeProfileId}
                  style={{
                    ...styles.profileCard,
                    ...(profile.id === state.activeProfileId ? styles.profileCardActive : undefined)
                  }}
                  onClick={() => void switchProfile(profile.id)}
                  disabled={switchingProfileId === profile.id}
                >
                  <div style={styles.profileCardTop}>
                    <div style={styles.profileOwner}>{profile.ownerName}</div>
                    {profile.id === state.activeProfileId ? <span style={styles.profileBadge}>Selected</span> : null}
                  </div>
                  <div style={styles.profileHousehold}>{profile.householdName}</div>
                  <div style={styles.profileMeta}>{profile.accountLabel ?? 'No account label yet'}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={styles.authHeader}>
            <div style={styles.stepLabel}>Unlock this device</div>
            <h2 style={styles.authHeading}>Enter the household PIN to continue.</h2>
            <p style={styles.authBody}>Pick up exactly where this device left off, with the same local data and review history intact.</p>
          </div>

          <div style={styles.fieldStack}>
            <label htmlFor="unlock-pin" style={styles.fieldLabel}>
              PIN
            </label>
            <div style={styles.inputWrap}>
              <input
                id="unlock-pin"
                aria-label="PIN"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                placeholder="Enter your household PIN"
                style={styles.input}
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void unlock()
                  }
                }}
              />
              <button
                type="button"
                aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                aria-pressed={showPin}
                style={styles.eyeButton}
                onClick={() => setShowPin((current) => !current)}
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error ? <div style={styles.error}>{error}</div> : null}
          </div>

          <button type="button" style={styles.primaryButton} onClick={() => void unlock()}>
            <span>Unlock</span>
            <ArrowRight size={16} />
          </button>

          <div style={styles.linkCluster}>
            <button type="button" style={styles.linkButton}>
              <DatabaseBackup size={16} />
              Restore from backup
            </button>
            <button type="button" style={styles.linkButton} onClick={() => setShowRecoveryReset(true)}>
              <LockKeyhole size={16} />
              Use recovery key
            </button>
            <button type="button" style={styles.linkButton} onClick={() => setShowNewProfilePrompt((current) => !current)}>
              <BadgePlus size={16} />
              Create new profile
            </button>
          </div>

        </section>
      </div>
    </AppShell>
  )
}

const sharedCard = {
  borderRadius: 'var(--radius-xl)',
  border: '1px solid var(--color-border)',
  boxShadow: 'var(--shadow-panel)'
}

const styles = {
  layout: {
    width: 'min(100%, 1320px)',
    display: 'grid',
    gridTemplateColumns: 'minmax(420px, 1fr) minmax(420px, 0.94fr)',
    gap: '40px',
    alignItems: 'stretch',
    height: 'calc(100dvh - 184px)',
    maxHeight: 'calc(100dvh - 184px)'
  },
  recoveryWrap: {
    width: 'min(100%, 920px)',
    display: 'grid',
    placeItems: 'center'
  },
  recoveryPanel: {
    ...sharedCard,
    width: 'min(100%, 720px)',
    padding: 'var(--space-2xl)',
    background: 'rgba(245, 241, 232, 0.84)'
  },
  newProfileScreen: {
    ...sharedCard,
    width: 'min(100%, 980px)',
    display: 'grid',
    gridTemplateColumns: 'minmax(250px, 0.82fr) minmax(0, 1.18fr)',
    overflow: 'hidden',
    background: 'rgba(245, 241, 232, 0.92)'
  },
  newProfileAside: {
    display: 'grid',
    alignContent: 'start',
    gap: 'var(--space-md)',
    padding: '36px 32px',
    background:
      'radial-gradient(circle at top left, rgba(15, 118, 110, 0.22), transparent 42%), linear-gradient(180deg, rgba(226, 215, 197, 0.82), rgba(245, 241, 232, 0.72))'
  },
  newProfileAsideBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    display: 'grid',
    placeItems: 'center',
    color: 'var(--color-accent)',
    background: 'rgba(245, 241, 232, 0.82)',
    border: '1px solid rgba(30, 27, 22, 0.08)'
  },
  newProfileAsideHeading: {
    margin: 0,
    fontSize: 'clamp(1.6rem, 2vw, 2.1rem)',
    lineHeight: 1.05
  },
  newProfileAsideBody: {
    margin: 0,
    color: 'var(--color-muted)',
    lineHeight: 1.5
  },
  newProfileStat: {
    display: 'grid',
    gap: 'var(--space-xs)',
    marginTop: 'var(--space-md)',
    padding: '16px 18px',
    borderRadius: 20,
    background: 'rgba(245, 241, 232, 0.72)',
    border: '1px solid rgba(30, 27, 22, 0.08)'
  },
  newProfileStatLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--color-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em'
  },
  newProfileStatValue: {
    fontSize: 24,
    lineHeight: 1.15,
    color: 'var(--color-ink)'
  },
  newProfileMain: {
    display: 'grid',
    gap: 'var(--space-xl)',
    padding: '40px 44px'
  },
  newProfileMainHeader: {
    display: 'grid',
    gap: 'var(--space-sm)'
  },
  visualPanel: {
    ...sharedCard,
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr) auto',
    gap: 'var(--space-lg)',
    padding: '36px',
    background:
      'radial-gradient(circle at top left, rgba(15, 118, 110, 0.28), transparent 32%), linear-gradient(145deg, rgba(16, 58, 55, 0.08), rgba(245, 241, 232, 0.16)), rgba(226, 215, 197, 0.88)',
    minHeight: 0,
    overflow: 'hidden'
  },
  visualTop: {
    display: 'grid',
    gap: 'var(--space-md)'
  },
  visualBrand: {
    display: 'flex',
    gap: 'var(--space-lg)',
    alignItems: 'flex-start'
  },
  visualCopy: {
    display: 'grid',
    gap: 'var(--space-sm)'
  },
  visualBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(245, 241, 232, 0.72)',
    border: '1px solid rgba(30, 27, 22, 0.1)'
  },
  visualEyebrow: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--color-accent)'
  },
  visualHeading: {
    margin: 0,
    fontSize: 'clamp(2.3rem, 3.3vw, 3.6rem)',
    lineHeight: 0.98
  },
  visualBody: {
    margin: 0,
    color: 'var(--color-muted)',
    maxWidth: 500,
    fontSize: 17,
    lineHeight: 1.45
  },
  visualCenter: {
    display: 'grid',
    placeItems: 'center',
    minHeight: 0
  },
  heroFrame: {
    width: '100%',
    maxWidth: 500,
    aspectRatio: '1.18 / 0.68',
    borderRadius: 26,
    padding: 14,
    background: 'linear-gradient(145deg, rgba(255,255,255,0.28), rgba(255,255,255,0.08))',
    border: '1px solid rgba(30, 27, 22, 0.08)',
    boxShadow: '0 24px 70px rgba(15, 20, 17, 0.18)'
  },
  heroWindow: {
    width: '100%',
    height: '100%',
    display: 'grid',
    gridTemplateColumns: '96px 1fr',
    gap: 16,
    padding: 16,
    borderRadius: 22,
    background: 'rgba(245, 241, 232, 0.92)'
  },
  heroSidebar: {
    borderRadius: 18,
    background: 'linear-gradient(180deg, rgba(15, 118, 110, 0.96), rgba(10, 90, 84, 0.92))',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)'
  },
  heroContent: {
    display: 'grid',
    gap: 14
  },
  heroBars: {
    display: 'grid',
    gap: 10
  },
  heroBarLong: {
    height: 14,
    width: '72%',
    borderRadius: 999,
    background: 'rgba(15, 118, 110, 0.2)'
  },
  heroBarMedium: {
    height: 12,
    width: '56%',
    borderRadius: 999,
    background: 'rgba(15, 118, 110, 0.14)'
  },
  heroBarShort: {
    height: 10,
    width: '34%',
    borderRadius: 999,
    background: 'rgba(30, 27, 22, 0.1)'
  },
  heroCards: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 0.8fr',
    gap: 14,
    alignItems: 'stretch'
  },
  heroCardPrimary: {
    borderRadius: 18,
    background: 'rgba(15, 118, 110, 0.1)',
    minHeight: 132
  },
  heroCardSecondary: {
    borderRadius: 18,
    background: 'rgba(30, 27, 22, 0.08)',
    minHeight: 132
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 'var(--space-md)'
  },
  infoCard: {
    padding: '18px',
    borderRadius: 22,
    background: 'rgba(245, 241, 232, 0.82)',
    border: '1px solid rgba(30, 27, 22, 0.08)'
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    display: 'grid',
    placeItems: 'center',
    color: 'var(--color-accent)',
    background: 'rgba(15, 118, 110, 0.1)'
  },
  infoLabel: {
    marginTop: 'var(--space-md)',
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--color-accent)'
  },
  infoValue: {
    marginTop: 'var(--space-sm)',
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1.2,
    wordBreak: 'break-word' as const
  },
  infoHint: {
    marginTop: 'var(--space-sm)',
    color: 'var(--color-muted)',
    lineHeight: 1.4
  },
  authPanel: {
    ...sharedCard,
    display: 'grid',
    alignContent: 'start',
    gap: '20px',
    padding: '28px 32px',
    background: 'rgba(245, 241, 232, 0.9)',
    minHeight: 0,
    overflow: 'hidden'
  },
  profileStrip: {
    display: 'grid',
    gap: 'var(--space-sm)'
  },
  profileStripHeader: {
    display: 'grid',
    gap: 'var(--space-xs)'
  },
  profileStripKicker: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--color-accent)'
  },
  profileStripHint: {
    color: 'var(--color-muted)',
    fontSize: 14
  },
  profileList: {
    display: 'grid',
    gap: '10px',
    maxHeight: 188,
    overflowY: 'auto' as const,
    paddingRight: '4px'
  },
  profileCard: {
    minHeight: 78,
    borderRadius: 18,
    border: '1px solid rgba(30, 27, 22, 0.12)',
    background: 'rgba(255,255,255,0.62)',
    padding: '12px 14px',
    display: 'grid',
    gap: '4px',
    textAlign: 'left' as const,
    alignContent: 'start'
  },
  profileCardActive: {
    border: '1px solid rgba(15, 118, 110, 0.32)',
    background: 'rgba(15, 118, 110, 0.1)'
  },
  profileCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 'var(--space-sm)',
    alignItems: 'center'
  },
  profileOwner: {
    fontSize: 17,
    fontWeight: 800,
    color: 'var(--color-ink)'
  },
  profileBadge: {
    padding: '4px 8px',
    borderRadius: 999,
    background: 'rgba(15, 118, 110, 0.14)',
    color: 'var(--color-accent)',
    fontSize: 12,
    fontWeight: 700
  },
  profileHousehold: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--color-accent)'
  },
  profileMeta: {
    color: 'var(--color-muted)',
    fontSize: 12,
    lineHeight: 1.35
  },
  authHeader: {
    display: 'grid',
    gap: 'var(--space-md)'
  },
  stepLabel: {
    color: 'var(--color-accent)',
    fontWeight: 700,
    fontSize: 14,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em'
  },
  authHeading: {
    margin: 0,
    fontSize: 'clamp(1.9rem, 2.6vw, 2.9rem)',
    lineHeight: 1,
    maxWidth: 520
  },
  authBody: {
    margin: 0,
    color: 'var(--color-muted)',
    fontSize: 16,
    lineHeight: 1.45,
    maxWidth: 520
  },
  fieldStack: {
    display: 'grid',
    gap: 'var(--space-md)'
  },
  fieldLabel: {
    fontWeight: 700,
    fontSize: 14
  },
  inputWrap: {
    position: 'relative' as const,
    display: 'grid',
    alignItems: 'center'
  },
  input: {
    minHeight: 58,
    borderRadius: 22,
    border: '1.5px solid rgba(15, 118, 110, 0.24)',
    background: 'rgba(255,255,255,0.78)',
    color: 'inherit',
    padding: '0 56px 0 20px',
    fontSize: 17,
    outline: 'none'
  },
  eyeButton: {
    position: 'absolute' as const,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.08)',
    background: 'rgba(245, 241, 232, 0.9)',
    color: 'var(--color-muted)',
    display: 'grid',
    placeItems: 'center'
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
    fontWeight: 700,
    fontSize: 17,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-sm)'
  },
  linkCluster: {
    display: 'grid',
    gap: '10px',
    justifyItems: 'start'
  },
  linkButton: {
    border: 0,
    background: 'transparent',
    color: 'var(--color-muted)',
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    fontWeight: 600
  },
  newProfileKicker: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--color-accent)'
  },
  newProfileScreenHeading: {
    margin: 'var(--space-sm) 0 0 0',
    fontSize: 'clamp(1.9rem, 2.6vw, 2.6rem)',
    lineHeight: 1.05
  },
  newProfileScreenBody: {
    margin: 0,
    color: 'var(--color-muted)',
    lineHeight: 1.45
  },
  newProfileChecklist: {
    display: 'grid',
    gap: 'var(--space-sm)',
    marginTop: 'var(--space-sm)'
  },
  newProfileChecklistItem: {
    display: 'grid',
    gap: '6px',
    padding: '16px 18px',
    borderRadius: 18,
    background: 'rgba(226, 215, 197, 0.46)',
    border: '1px solid rgba(30, 27, 22, 0.08)',
    color: 'var(--color-ink)'
  },
  newProfileChecklistTitle: {
    fontSize: 16,
    fontWeight: 700
  },
  newProfileChecklistText: {
    color: 'var(--color-muted)',
    lineHeight: 1.45
  },
  newProfileActions: {
    display: 'flex',
    gap: 'var(--space-md)',
    flexWrap: 'wrap' as const,
    marginTop: 'var(--space-sm)'
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(30, 27, 22, 0.04)',
    color: 'var(--color-ink)',
    padding: '0 18px',
    fontWeight: 600
  },
  dangerButton: {
    minHeight: 48,
    border: 0,
    borderRadius: 999,
    background: 'var(--color-accent-strong)',
    color: '#fff',
    padding: '0 18px',
    fontWeight: 700
  }
} as const
