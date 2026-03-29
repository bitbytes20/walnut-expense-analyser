export interface RedactedTransaction {
  id: string
  importBatchId: string
  transactionDateSortable: string
  signedAmountMinor: number
  normalizedType: string
  categoryId?: string
  description: '[REDACTED]'
  reference: '[REDACTED]' | null
  tags: ['[REDACTED]'] | []
}

export interface DiagnosticsBundle {
  type: 'full' | 'redacted'
  generatedAt: string
  systemInfo: {
    nodeVersion: string
    platform: string
    appVersion: string
  }
  transactions: unknown[]
  auditEvents: unknown[]
}

export interface GenerateDiagnosticsBundleInput {
  type: 'full' | 'redacted'
}
