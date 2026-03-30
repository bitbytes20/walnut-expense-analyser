import { describe, it } from 'vitest'

describe('Phase 10: auto-apply rules at import commit', () => {
  it.todo('applyAllRulesToTransactions categorizes uncategorized transactions using enabled user rules')
  it.todo('skips transactions that already have a category_id (does not overwrite)')
  it.todo('applies rules in sort_order ASC (first match wins)')
  it.todo('returns array of { ruleName, count } for rules with count > 0')
  it.todo('returns empty array when no rules match any transaction')
  it.todo('emits audit event for each auto-categorized transaction')
  it.todo('only considers enabled non-system rules (is_enabled=1 AND is_system=0)')
})
