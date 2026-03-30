/**
 * Pure multi-select logic for the transaction ledger.
 * Extracted as pure functions for testability — no React dependencies.
 *
 * Special sentinel value '__all__' used for select-all / deselect-all operations.
 */

export interface ComputeRangeSelectResult {
  selectedIds: Set<string>
  newAnchor: string | null
}

/**
 * Compute the next selection state given a click event.
 *
 * - Normal click (shiftHeld=false): toggle single row.
 * - Shift-click (shiftHeld=true) with anchor: add the range [anchor..target] to selection.
 * - Shift-click without anchor: behaves like a normal click.
 * - Special target '__all__' with checked=true: select all pagedRowIds.
 * - Special target '__all__' with checked=false: deselect all.
 *
 * The function never mutates the incoming `currentSelection` — it always returns a new Set.
 */
export function computeRangeSelect(
  pagedRowIds: string[],
  anchorId: string | null,
  targetId: string,
  checked: boolean,
  currentSelection: Set<string>
): ComputeRangeSelectResult {
  // Select-all / deselect-all sentinel
  if (targetId === '__all__') {
    if (checked) {
      return { selectedIds: new Set(pagedRowIds), newAnchor: anchorId }
    }
    return { selectedIds: new Set(), newAnchor: null }
  }

  const next = new Set(currentSelection)

  // Shift+click range select
  const isShift = anchorId !== null && anchorId !== targetId
  if (isShift && checked) {
    const anchorIndex = pagedRowIds.indexOf(anchorId!)
    const targetIndex = pagedRowIds.indexOf(targetId)

    if (anchorIndex !== -1 && targetIndex !== -1) {
      const start = Math.min(anchorIndex, targetIndex)
      const end = Math.max(anchorIndex, targetIndex)
      for (let i = start; i <= end; i++) {
        next.add(pagedRowIds[i])
      }
      // Anchor stays the same during shift-select
      return { selectedIds: next, newAnchor: anchorId }
    }
  }

  // Normal toggle
  if (checked) {
    next.add(targetId)
    return { selectedIds: next, newAnchor: targetId }
  } else {
    next.delete(targetId)
    return { selectedIds: next, newAnchor: null }
  }
}
