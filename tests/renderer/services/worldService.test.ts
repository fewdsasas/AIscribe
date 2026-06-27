// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { createWorldService } from '@renderer/services/worldService'
import { createMockAiscribeAPI } from '../helpers/mock-api'
import type { World } from '@shared/types'
import type { SaveWorldData } from '@shared/types/ipc'

describe('createWorldService', () => {
  it('should delegate getByNovel to api.worldGetByNovel', async () => {
    const api = createMockAiscribeAPI()
    const service = createWorldService(api)
    const world: World = { id: 'w1', novelId: 'n1' } as World
    vi.mocked(api.worldGetByNovel).mockResolvedValue(world)

    const result = await service.getByNovel('n1')

    expect(api.worldGetByNovel).toHaveBeenCalledWith('n1')
    expect(result).toBe(world)
  })

  it('should return null when api.worldGetByNovel returns null', async () => {
    const api = createMockAiscribeAPI()
    const service = createWorldService(api)
    vi.mocked(api.worldGetByNovel).mockResolvedValue(null)

    const result = await service.getByNovel('n1')

    expect(result).toBeNull()
  })

  it('should delegate save to api.worldSave', async () => {
    const api = createMockAiscribeAPI()
    const service = createWorldService(api)
    const data: SaveWorldData = { novelId: 'n1', name: '玄幻世界', type: 'fantasy' }
    const world: World = { id: 'w1', novelId: 'n1' } as World
    vi.mocked(api.worldSave).mockResolvedValue(world)

    const result = await service.save(data)

    expect(api.worldSave).toHaveBeenCalledWith(data)
    expect(result).toBe(world)
  })
})
