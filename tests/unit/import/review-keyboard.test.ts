import { describe, it } from 'vitest'

/**
 * Wave 0 scaffold — WORKFLOW-07 keyboard handler guard for review queue.
 * These stubs will be implemented in Phase 9 Plan 04 when the review keyboard
 * navigation feature is built. Tests exercise the keyboard handler as a pure
 * function receiving mock events and dispatch callbacks, NOT a DOM test.
 */
describe('review keyboard handler', () => {
  it.todo('A key dispatches approve on active item')
  it.todo('R key dispatches reject on active item')
  it.todo('ArrowDown advances to next item')
  it.todo('ArrowUp moves to previous item')
  it.todo('A key is ignored when target is INPUT element')
  it.todo('R key is ignored when target is TEXTAREA element')
  it.todo('A key is ignored when target is contentEditable')
  it.todo('ArrowDown at last item stays on last item')
  it.todo('ArrowUp at first item stays on first item')
})
