import { useState } from 'react'
import type { AccountProfileDraft } from '../../../../shared/contracts/account'
import { stepStyles } from './WelcomeStep'

interface AccountProfileStepProps {
  initialValue?: AccountProfileDraft
  onBack: () => void
  onNext: (draft: AccountProfileDraft) => void
  onSkip: () => void
}

const defaultDraft: AccountProfileDraft = {
  bankName: 'ICICI',
  displayName: '',
  accountHolderName: '',
  baseCurrency: 'INR'
}

export const AccountProfileStep = ({ initialValue, onBack, onNext, onSkip }: AccountProfileStepProps) => {
  const [draft, setDraft] = useState<AccountProfileDraft>(initialValue ?? defaultDraft)
  const [error, setError] = useState('')

  const submit = () => {
    if (!draft.displayName.trim() || !draft.accountHolderName.trim() || !draft.baseCurrency.trim()) {
      setError('Complete the required account fields or skip for now.')
      return
    }
    setError('')
    onNext({ ...draft, bankName: 'ICICI' })
  }

  return (
    <section style={stepStyles.section}>
      <div style={stepStyles.stepLabel}>Step 5 of 6</div>
      <h2 style={stepStyles.heading}>Create the single release-1 account profile.</h2>
      <div style={stepStyles.field}>
        <label htmlFor="bank-name">Bank</label>
        <input id="bank-name" style={stepStyles.input} value="ICICI" readOnly />
      </div>
      <div style={stepStyles.field}>
        <label htmlFor="display-name">Account display name</label>
        <input id="display-name" style={stepStyles.input} value={draft.displayName} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} />
      </div>
      <div style={stepStyles.field}>
        <label htmlFor="account-holder-name">Account holder name</label>
        <input id="account-holder-name" style={stepStyles.input} value={draft.accountHolderName} onChange={(event) => setDraft((current) => ({ ...current, accountHolderName: event.target.value }))} />
      </div>
      <div style={{ display: 'grid', gap: 'var(--space-md)', gridTemplateColumns: '1fr 1fr' }}>
        <div style={stepStyles.field}>
          <label htmlFor="masked-account-number">Masked account number</label>
          <input id="masked-account-number" style={stepStyles.input} value={draft.maskedAccountNumber ?? ''} onChange={(event) => setDraft((current) => ({ ...current, maskedAccountNumber: event.target.value }))} />
        </div>
        <div style={stepStyles.field}>
          <label htmlFor="nickname">Nickname</label>
          <input id="nickname" style={stepStyles.input} value={draft.nickname ?? ''} onChange={(event) => setDraft((current) => ({ ...current, nickname: event.target.value }))} />
        </div>
      </div>
      <div style={{ display: 'grid', gap: 'var(--space-md)', gridTemplateColumns: '1fr 1fr' }}>
        <div style={stepStyles.field}>
          <label htmlFor="base-currency">Base currency</label>
          <input id="base-currency" style={stepStyles.input} value={draft.baseCurrency} onChange={(event) => setDraft((current) => ({ ...current, baseCurrency: event.target.value }))} />
        </div>
        <div style={stepStyles.field}>
          <label htmlFor="opening-balance">Opening balance</label>
          <input id="opening-balance" type="number" style={stepStyles.input} value={draft.openingBalance ?? ''} onChange={(event) => setDraft((current) => ({ ...current, openingBalance: event.target.value ? Number(event.target.value) : undefined }))} />
        </div>
      </div>
      {error ? <div style={stepStyles.error}>{error}</div> : null}
      <div style={stepStyles.actions}>
        <button type="button" style={stepStyles.secondaryButton} onClick={onBack}>Back</button>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button type="button" style={stepStyles.secondaryButton} onClick={onSkip}>Skip for now</button>
          <button type="button" style={stepStyles.primaryButton} onClick={submit}>Next</button>
        </div>
      </div>
    </section>
  )
}
