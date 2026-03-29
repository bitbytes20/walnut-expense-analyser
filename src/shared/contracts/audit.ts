export interface AuditEvent {
  id: string
  timestampISO: string
  category: 'security' | 'review' | 'transaction' | 'settings' | 'import'
  eventType: string
  entityId?: string
  metadata: string
}
