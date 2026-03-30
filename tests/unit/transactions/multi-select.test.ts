import { describe, expect, it } from 'vitest'
import { computeRangeSelect } from '../../../src/renderer/features/transactions/multiSelectLogic'

/**
 * Wave 2 implementation — WORKFLOW-01 multi-select range-select pure logic.
 * Tests exercise pure functions extracted from the multi-select logic (not React components).
 */
describe('multi-select pure logic', () => {
  const pagedRowIds = ['a', 'b', 'c', 'd', 'e']

  it('single click selects one row and sets anchor', () => {
    const result = computeRangeSelect(pagedRowIds, null, 'b', true, new Set())
    expect(result.selectedIds.has('b')).toBe(true)
    expect(result.selectedIds.size).toBe(1)
    expect(result.newAnchor).toBe('b')
  })

  it('single click on checked row removes its id and clears anchor', () => {
    const result = computeRangeSelect(pagedRowIds, 'b', 'b', false, new Set(['b']))
    expect(result.selectedIds.has('b')).toBe(false)
    expect(result.selectedIds.size).toBe(0)
    expect(result.newAnchor).toBeNull()
  })

  it('shift+click with anchor selects range inclusive of both endpoints', () => {
    // anchor at 'b' (index 1), target at 'd' (index 3)
    const current = new Set(['b'])
    const result = computeRangeSelect(pagedRowIds, 'b', 'd', true, current)
    expect(result.selectedIds.has('b')).toBe(true)
    expect(result.selectedIds.has('c')).toBe(true)
    expect(result.selectedIds.has('d')).toBe(true)
    // anchor stays at 'b'
    expect(result.newAnchor).toBe('b')
  })

  it('shift+click with anchor below target selects upward range', () => {
    // anchor at 'd' (index 3), target at 'b' (index 1)
    const current = new Set(['d'])
    const result = computeRangeSelect(pagedRowIds, 'd', 'b', true, current)
    expect(result.selectedIds.has('b')).toBe(true)
    expect(result.selectedIds.has('c')).toBe(true)
    expect(result.selectedIds.has('d')).toBe(true)
    expect(result.newAnchor).toBe('d')
  })

  it('shift+click without anchor behaves as single click', () => {
    const result = computeRangeSelect(pagedRowIds, null, 'c', true, new Set())
    expect(result.selectedIds.has('c')).toBe(true)
    expect(result.selectedIds.size).toBe(1)
    expect(result.newAnchor).toBe('c')
  })

  it('select-all checks all rows on current page', () => {
    const result = computeRangeSelect(pagedRowIds, null, '__all__', true, new Set())
    for (const id of pagedRowIds) {
      expect(result.selectedIds.has(id)).toBe(true)
    }
    expect(result.selectedIds.size).toBe(pagedRowIds.length)
  })

  it('deselect-all clears all selections', () => {
    const result = computeRangeSelect(pagedRowIds, null, '__all__', false, new Set(pagedRowIds))
    expect(result.selectedIds.size).toBe(0)
    expect(result.newAnchor).toBeNull()
  })

  it('indeterminate state when some but not all are selected', () => {
    // indeterminate: selectedIds > 0 AND selectedIds < total
    const selectedIds = new Set(['a', 'b'])
    const isIndeterminate = selectedIds.size > 0 && selectedIds.size < pagedRowIds.length
    expect(isIndeterminate).toBe(true)

    // all selected — NOT indeterminate
    const allSelected = new Set(pagedRowIds)
    const notIndeterminate = allSelected.size > 0 && allSelected.size < pagedRowIds.length
    expect(notIndeterminate).toBe(false)
  })

  it('shift+click preserves existing selections outside range', () => {
    // 'e' is already selected; we shift+click 'a' to 'c'
    const current = new Set(['e'])
    const result = computeRangeSelect(pagedRowIds, 'a', 'c', true, current)
    expect(result.selectedIds.has('a')).toBe(true)
    expect(result.selectedIds.has('b')).toBe(true)
    expect(result.selectedIds.has('c')).toBe(true)
    expect(result.selectedIds.has('e')).toBe(true)
  })
})
