// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { createMemoryService } from '@renderer/services/memoryService'
import { createMockAiscribeAPI } from '../helpers/mock-api'

describe('createMemoryService', () => {
  it('should delegate getMemoryUsage to api.getMemoryUsage', async () => {
    const api = createMockAiscribeAPI()
    const service = createMemoryService(api)
    const usage = {
      rss: 100,
      heapTotal: 80,
      heapUsed: 60,
      external: 10,
      arrayBuffers: 5,
      dbSize: 1024,
      timestamp: Date.now()
    }
    vi.mocked(api.getMemoryUsage).mockResolvedValue(usage)

    const result = await service.getMemoryUsage()

    expect(api.getMemoryUsage).toHaveBeenCalled()
    expect(result).toBe(usage)
  })
})
