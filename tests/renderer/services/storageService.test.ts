// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { createStorageService } from '@renderer/services/storageService'
import { createMockAiscribeAPI } from '../helpers/mock-api'

describe('createStorageService', () => {
  it('should delegate set to api.secureStorageSet', async () => {
    const api = createMockAiscribeAPI()
    const service = createStorageService(api)
    vi.mocked(api.secureStorageSet).mockResolvedValue({ success: true })

    const result = await service.set('key1', 'value1')

    expect(api.secureStorageSet).toHaveBeenCalledWith('key1', 'value1')
    expect(result).toBe(true)
  })

  it('should delegate get to api.secureStorageGet', async () => {
    const api = createMockAiscribeAPI()
    const service = createStorageService(api)
    vi.mocked(api.secureStorageGet).mockResolvedValue('stored-value')

    const result = await service.get('key1')

    expect(api.secureStorageGet).toHaveBeenCalledWith('key1')
    expect(result).toBe('stored-value')
  })

  it('should delegate remove to api.secureStorageRemove', async () => {
    const api = createMockAiscribeAPI()
    const service = createStorageService(api)
    vi.mocked(api.secureStorageRemove).mockResolvedValue({ success: true })

    const result = await service.remove('key1')

    expect(api.secureStorageRemove).toHaveBeenCalledWith('key1')
    expect(result).toBe(true)
  })

  it('should return false when secureStorageSet is unavailable', async () => {
    const api = createMockAiscribeAPI()
    delete (api as unknown as Record<string, unknown>).secureStorageSet
    const service = createStorageService(api)

    const result = await service.set('key1', 'value1')

    expect(result).toBe(false)
  })

  it('should return null when secureStorageGet is unavailable', async () => {
    const api = createMockAiscribeAPI()
    delete (api as unknown as Record<string, unknown>).secureStorageGet
    const service = createStorageService(api)

    const result = await service.get('key1')

    expect(result).toBeNull()
  })

  it('should return false when secureStorageRemove is unavailable', async () => {
    const api = createMockAiscribeAPI()
    delete (api as unknown as Record<string, unknown>).secureStorageRemove
    const service = createStorageService(api)

    const result = await service.remove('key1')

    expect(result).toBe(false)
  })
})
