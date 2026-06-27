// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { createOutlineService } from '@renderer/services/outlineService'
import { createMockAiscribeAPI } from '../helpers/mock-api'
import type { Outline } from '@shared/types'
import type { SaveOutlineData } from '@shared/types/ipc'

describe('createOutlineService', () => {
  it('should delegate get to api.outlineGet', async () => {
    const api = createMockAiscribeAPI()
    const service = createOutlineService(api)
    const outline: Outline = { id: 'o1', novelId: 'n1' } as Outline
    vi.mocked(api.outlineGet).mockResolvedValue(outline)

    const result = await service.get('n1')

    expect(api.outlineGet).toHaveBeenCalledWith('n1')
    expect(result).toBe(outline)
  })

  it('should return null when api.outlineGet returns null', async () => {
    const api = createMockAiscribeAPI()
    const service = createOutlineService(api)
    vi.mocked(api.outlineGet).mockResolvedValue(null)

    const result = await service.get('n1')

    expect(result).toBeNull()
  })

  it('should delegate save to api.outlineSave', async () => {
    const api = createMockAiscribeAPI()
    const service = createOutlineService(api)
    const data: SaveOutlineData = { novelId: 'n1', type: 'brief', content: '{}' }
    const outline: Outline = { id: 'o1', novelId: 'n1' } as Outline
    vi.mocked(api.outlineSave).mockResolvedValue(outline)

    const result = await service.save(data)

    expect(api.outlineSave).toHaveBeenCalledWith(data)
    expect(result).toBe(outline)
  })
})
