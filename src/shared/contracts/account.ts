export type SupportedBankName = 'ICICI'

export interface AccountProfileDraft {
  bankName: SupportedBankName
  displayName: string
  accountHolderName: string
  maskedAccountNumber?: string
  nickname?: string
  baseCurrency: string
  openingBalance?: number
  openingBalanceDate?: string
  skippedDuringOnboarding?: boolean
}

export interface AccountProfile extends AccountProfileDraft {
  id: string
  createdAt: string
  updatedAt: string
}
