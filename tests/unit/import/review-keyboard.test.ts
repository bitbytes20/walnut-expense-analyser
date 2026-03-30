import { describe, expect, it, vi } from 'vitest'
import { handleReviewKeydown, type ReviewKeyboardContext } from '../../../src/renderer/features/import/ReviewQueueScreen'

const makeFlatItems = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ batchId: `batch-${i}`, itemId: `item-${i}` }))

const makeEvent = (key: string, overrides: Partial<{ tagName: string; isContentEditable: boolean }> = {}) => ({
  key,
  target: {
    tagName: overrides.tagName ?? 'DIV',
    isContentEditable: overrides.isContentEditable ?? false
  },
  preventDefault: vi.fn()
})

const makeCtx = (overrides: Partial<ReviewKeyboardContext> = {}): ReviewKeyboardContext => ({
  activeItemId: 'item-1',
  activeBatchId: 'batch-1',
  flatItems: makeFlatItems(3),
  onApprove: vi.fn(),
  onReject: vi.fn(),
  onNavigate: vi.fn(),
  ...overrides
})

describe('review keyboard handler', () => {
  it('A key dispatches approve on active item', () => {
    const ctx = makeCtx({ activeItemId: 'item-1', activeBatchId: 'batch-1' })
    const event = makeEvent('a')
    handleReviewKeydown(event, ctx)
    expect(ctx.onApprove).toHaveBeenCalledWith('batch-1', 'item-1')
    expect(event.preventDefault).toHaveBeenCalled()
  })

  it('R key dispatches reject on active item', () => {
    const ctx = makeCtx({ activeItemId: 'item-1', activeBatchId: 'batch-1' })
    const event = makeEvent('r')
    handleReviewKeydown(event, ctx)
    expect(ctx.onReject).toHaveBeenCalledWith('batch-1', 'item-1')
    expect(event.preventDefault).toHaveBeenCalled()
  })

  it('ArrowDown advances to next item', () => {
    const flatItems = makeFlatItems(3)
    const ctx = makeCtx({ activeItemId: 'item-1', activeBatchId: 'batch-1', flatItems })
    const event = makeEvent('ArrowDown')
    handleReviewKeydown(event, ctx)
    expect(ctx.onNavigate).toHaveBeenCalledWith('batch-2', 'item-2')
    expect(event.preventDefault).toHaveBeenCalled()
  })

  it('ArrowUp moves to previous item', () => {
    const flatItems = makeFlatItems(3)
    const ctx = makeCtx({ activeItemId: 'item-1', activeBatchId: 'batch-1', flatItems })
    const event = makeEvent('ArrowUp')
    handleReviewKeydown(event, ctx)
    expect(ctx.onNavigate).toHaveBeenCalledWith('batch-0', 'item-0')
    expect(event.preventDefault).toHaveBeenCalled()
  })

  it('A key is ignored when target is INPUT element', () => {
    const ctx = makeCtx()
    const event = makeEvent('a', { tagName: 'INPUT' })
    handleReviewKeydown(event, ctx)
    expect(ctx.onApprove).not.toHaveBeenCalled()
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('R key is ignored when target is TEXTAREA element', () => {
    const ctx = makeCtx()
    const event = makeEvent('r', { tagName: 'TEXTAREA' })
    handleReviewKeydown(event, ctx)
    expect(ctx.onReject).not.toHaveBeenCalled()
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('A key is ignored when target is contentEditable', () => {
    const ctx = makeCtx()
    const event = makeEvent('a', { isContentEditable: true })
    handleReviewKeydown(event, ctx)
    expect(ctx.onApprove).not.toHaveBeenCalled()
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('ArrowDown at last item stays on last item', () => {
    const flatItems = makeFlatItems(3)
    const ctx = makeCtx({ activeItemId: 'item-2', activeBatchId: 'batch-2', flatItems })
    const event = makeEvent('ArrowDown')
    handleReviewKeydown(event, ctx)
    expect(ctx.onNavigate).toHaveBeenCalledWith('batch-2', 'item-2')
    expect(event.preventDefault).toHaveBeenCalled()
  })

  it('ArrowUp at first item stays on first item', () => {
    const flatItems = makeFlatItems(3)
    const ctx = makeCtx({ activeItemId: 'item-0', activeBatchId: 'batch-0', flatItems })
    const event = makeEvent('ArrowUp')
    handleReviewKeydown(event, ctx)
    expect(ctx.onNavigate).toHaveBeenCalledWith('batch-0', 'item-0')
    expect(event.preventDefault).toHaveBeenCalled()
  })
})
