import { HardDriveDownload } from 'lucide-react'

interface WelcomeStepProps {
  onNext: () => void
}

export const WelcomeStep = ({ onNext }: WelcomeStepProps) => (
  <section style={stepStyles.section}>
    <div style={stepStyles.stepLabel}>Step 1 of 6</div>
    <h2 style={stepStyles.heading}>Bring your household finances into one trusted desktop view.</h2>
    <p style={stepStyles.body}>
      Walnut keeps setup and analysis saved on this device, so you can move from first launch to a secure import-ready dashboard without giving up privacy.
    </p>
    <div style={stepStyles.footer}>
      <ProgressSavedIndicator />
      <button type="button" style={stepStyles.primaryButton} onClick={onNext}>
        Start setup
      </button>
    </div>
  </section>
)

export const stepStyles = {
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-md)'
  },
  stepLabel: {
    color: 'var(--color-accent)',
    fontSize: 14,
    fontWeight: 600
  },
  heading: {
    margin: 0,
    fontSize: 'var(--font-display-size)',
    lineHeight: 1.1
  },
  body: {
    margin: 0,
    color: 'var(--color-muted)',
    lineHeight: 1.5
  },
  footer: {
    marginTop: 'var(--space-xl)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  helper: {
    color: 'var(--color-muted)',
    fontSize: 14
  },
  saveIndicator: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    color: 'var(--color-muted)',
    fontSize: 13,
    fontWeight: 600
  },
  primaryButton: {
    minHeight: 56,
    border: 0,
    borderRadius: 999,
    padding: '0 24px',
    background: 'var(--color-accent-strong)',
    color: 'white',
    fontWeight: 600
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 999,
    border: '1px solid rgba(30, 27, 22, 0.18)',
    background: 'rgba(30, 27, 22, 0.05)',
    color: 'var(--color-ink)',
    padding: '0 20px',
    fontWeight: 600
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-sm)'
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
  actions: {
    marginTop: 'var(--space-xl)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }
}

export const ProgressSavedIndicator = () => (
  <div style={stepStyles.saveIndicator} aria-label="Progress saved locally" title="Progress saved on this device">
    <HardDriveDownload size={14} />
    <span>Saved locally</span>
  </div>
)
