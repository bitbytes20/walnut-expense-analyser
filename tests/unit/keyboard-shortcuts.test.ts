import { describe, expect, it, vi } from 'vitest'
import { handleGlobalShortcut } from '../../src/renderer/App'

function makeEvent(
  key: string,
  options: {
    ctrlKey?: boolean
    altKey?: boolean
    shiftKey?: boolean
    metaKey?: boolean
    targetTag?: string
    isContentEditable?: boolean
  } = {}
): KeyboardEvent {
  const target = {
    tagName: options.targetTag ?? 'BODY',
    isContentEditable: options.isContentEditable ?? false
  } as HTMLElement

  return {
    key,
    ctrlKey: options.ctrlKey ?? false,
    altKey: options.altKey ?? false,
    shiftKey: options.shiftKey ?? false,
    metaKey: options.metaKey ?? false,
    target,
    preventDefault: vi.fn()
  } as unknown as KeyboardEvent
}

function makeActions() {
  return {
    setWorkspaceScreen: vi.fn(),
    setImportAreaScreen: vi.fn(),
    lockApp: vi.fn()
  }
}

describe('handleGlobalShortcut', () => {
  describe('navigation shortcuts', () => {
    it('Ctrl+1 calls setWorkspaceScreen("home")', () => {
      const actions = makeActions()
      const event = makeEvent('1', { ctrlKey: true })
      const result = handleGlobalShortcut(event, actions)
      expect(result).toBe(true)
      expect(actions.setWorkspaceScreen).toHaveBeenCalledWith('home')
      expect(actions.setImportAreaScreen).not.toHaveBeenCalled()
      expect(actions.lockApp).not.toHaveBeenCalled()
    })

    it('Ctrl+2 calls setWorkspaceScreen("imports") and setImportAreaScreen({ type: "workspace" })', () => {
      const actions = makeActions()
      const event = makeEvent('2', { ctrlKey: true })
      const result = handleGlobalShortcut(event, actions)
      expect(result).toBe(true)
      expect(actions.setWorkspaceScreen).toHaveBeenCalledWith('imports')
      expect(actions.setImportAreaScreen).toHaveBeenCalledWith({ type: 'workspace' })
    })

    it('Ctrl+3 calls setWorkspaceScreen("transactions")', () => {
      const actions = makeActions()
      const event = makeEvent('3', { ctrlKey: true })
      const result = handleGlobalShortcut(event, actions)
      expect(result).toBe(true)
      expect(actions.setWorkspaceScreen).toHaveBeenCalledWith('transactions')
      expect(actions.setImportAreaScreen).not.toHaveBeenCalled()
    })

    it('Ctrl+4 calls setWorkspaceScreen("imports") and setImportAreaScreen({ type: "history" })', () => {
      const actions = makeActions()
      const event = makeEvent('4', { ctrlKey: true })
      const result = handleGlobalShortcut(event, actions)
      expect(result).toBe(true)
      expect(actions.setWorkspaceScreen).toHaveBeenCalledWith('imports')
      expect(actions.setImportAreaScreen).toHaveBeenCalledWith({ type: 'history' })
    })

    it('Ctrl+5 calls setWorkspaceScreen("categories-rules")', () => {
      const actions = makeActions()
      const event = makeEvent('5', { ctrlKey: true })
      const result = handleGlobalShortcut(event, actions)
      expect(result).toBe(true)
      expect(actions.setWorkspaceScreen).toHaveBeenCalledWith('categories-rules')
    })

    it('Ctrl+6 calls setWorkspaceScreen("audit")', () => {
      const actions = makeActions()
      const event = makeEvent('6', { ctrlKey: true })
      const result = handleGlobalShortcut(event, actions)
      expect(result).toBe(true)
      expect(actions.setWorkspaceScreen).toHaveBeenCalledWith('audit')
    })

    it('Ctrl+7 calls setWorkspaceScreen("settings")', () => {
      const actions = makeActions()
      const event = makeEvent('7', { ctrlKey: true })
      const result = handleGlobalShortcut(event, actions)
      expect(result).toBe(true)
      expect(actions.setWorkspaceScreen).toHaveBeenCalledWith('settings')
    })

    it('Ctrl+8 calls lockApp', () => {
      const actions = makeActions()
      const event = makeEvent('8', { ctrlKey: true })
      const result = handleGlobalShortcut(event, actions)
      expect(result).toBe(true)
      expect(actions.lockApp).toHaveBeenCalled()
      expect(actions.setWorkspaceScreen).not.toHaveBeenCalled()
    })
  })

  describe('input element guard', () => {
    it('ignores Ctrl+1 when target is an INPUT element', () => {
      const actions = makeActions()
      const event = makeEvent('1', { ctrlKey: true, targetTag: 'INPUT' })
      const result = handleGlobalShortcut(event, actions)
      expect(result).toBe(false)
      expect(actions.setWorkspaceScreen).not.toHaveBeenCalled()
    })

    it('ignores Ctrl+1 when target is a TEXTAREA element', () => {
      const actions = makeActions()
      const event = makeEvent('1', { ctrlKey: true, targetTag: 'TEXTAREA' })
      const result = handleGlobalShortcut(event, actions)
      expect(result).toBe(false)
      expect(actions.setWorkspaceScreen).not.toHaveBeenCalled()
    })

    it('ignores Ctrl+1 when target.isContentEditable is true', () => {
      const actions = makeActions()
      const event = makeEvent('1', { ctrlKey: true, isContentEditable: true })
      const result = handleGlobalShortcut(event, actions)
      expect(result).toBe(false)
      expect(actions.setWorkspaceScreen).not.toHaveBeenCalled()
    })
  })

  describe('modifier guards', () => {
    it('ignores key="1" without ctrlKey', () => {
      const actions = makeActions()
      const event = makeEvent('1', { ctrlKey: false })
      const result = handleGlobalShortcut(event, actions)
      expect(result).toBe(false)
      expect(actions.setWorkspaceScreen).not.toHaveBeenCalled()
    })

    it('ignores Ctrl+Alt+1 (alt modifier present)', () => {
      const actions = makeActions()
      const event = makeEvent('1', { ctrlKey: true, altKey: true })
      const result = handleGlobalShortcut(event, actions)
      expect(result).toBe(false)
      expect(actions.setWorkspaceScreen).not.toHaveBeenCalled()
    })
  })
})
