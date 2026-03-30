import { describe, expect, it } from 'vitest'
import { WalnutRepository } from '../../src/main/persistence/db'

const createRepository = () => new WalnutRepository(':memory:')

describe('filter presets repository', () => {
  it('saveFilterPreset creates a new preset and returns list', () => {
    const repository = createRepository()
    const result = repository.saveFilterPreset({
      name: 'Monthly bills',
      filters: { categories: ['utilities'] }
    })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Monthly bills')
    expect(result[0].filters).toMatchObject({ categories: ['utilities'] })
    expect(result[0].id).toBeTruthy()
    expect(result[0].createdAt).toBeTruthy()
    expect(result[0].updatedAt).toBeTruthy()
    repository.close()
  })

  it('listFilterPresets returns all presets ordered by updated_at DESC', async () => {
    const repository = createRepository()
    repository.saveFilterPreset({ name: 'Preset A', filters: { types: ['expense'] } })
    // Small delay to ensure different updated_at values
    await new Promise((resolve) => setTimeout(resolve, 10))
    repository.saveFilterPreset({ name: 'Preset B', filters: { types: ['income'] } })

    const presets = repository.listFilterPresets()
    expect(presets).toHaveLength(2)
    // Preset B was saved later, so it should be first (DESC order)
    expect(presets[0].name).toBe('Preset B')
    expect(presets[1].name).toBe('Preset A')
    repository.close()
  })

  it('renameFilterPreset updates the name and updated_at', async () => {
    const repository = createRepository()
    const created = repository.saveFilterPreset({ name: 'Old name', filters: { types: ['expense'] } })
    const presetId = created[0].id
    const originalUpdatedAt = created[0].updatedAt

    // Small delay to ensure different updated_at
    await new Promise((resolve) => setTimeout(resolve, 10))
    const result = repository.renameFilterPreset({ id: presetId, name: 'New name' })

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('New name')
    expect(result[0].id).toBe(presetId)
    expect(result[0].updatedAt).not.toBe(originalUpdatedAt)
    repository.close()
  })

  it('deleteFilterPreset removes the preset', () => {
    const repository = createRepository()
    const created = repository.saveFilterPreset({ name: 'To delete', filters: {} })
    const presetId = created[0].id

    const result = repository.deleteFilterPreset({ id: presetId })
    expect(result).toHaveLength(0)
    repository.close()
  })

  it('saveFilterPreset stores filters_json correctly round-tripped', () => {
    const repository = createRepository()
    const complexFilters = {
      search: 'groceries',
      dateFrom: '2025-01-01',
      types: ['debit' as never, 'expense' as never],
      tags: ['food'],
      categories: ['Groceries'],
      amountMinMinor: 100,
      amountMaxMinor: 50000
    }
    // Use valid filter fields from the schema
    const filters = {
      search: 'groceries',
      dateFrom: '2025-01-01',
      tags: ['food'],
      categories: ['Groceries'],
      amountMinMinor: 100,
      amountMaxMinor: 50000
    }
    const created = repository.saveFilterPreset({ name: 'Complex preset', filters })
    const presetId = created[0].id

    const listed = repository.listFilterPresets()
    const found = listed.find((p) => p.id === presetId)
    expect(found).toBeDefined()
    expect(found!.filters).toMatchObject({
      search: 'groceries',
      dateFrom: '2025-01-01',
      tags: ['food'],
      categories: ['Groceries'],
      amountMinMinor: 100,
      amountMaxMinor: 50000
    })
    repository.close()
  })

  it('deleteFilterPreset with non-existent id returns current list without error', () => {
    const repository = createRepository()
    repository.saveFilterPreset({ name: 'Existing preset', filters: { types: ['expense'] } })

    // Delete with non-existent ID should not throw and return current list
    let result: ReturnType<typeof repository.deleteFilterPreset>
    expect(() => {
      result = repository.deleteFilterPreset({ id: 'non-existent-id-xyz' })
    }).not.toThrow()

    // The existing preset should still be there
    expect(result!).toHaveLength(1)
    expect(result![0].name).toBe('Existing preset')
    repository.close()
  })
})
