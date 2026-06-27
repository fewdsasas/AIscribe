// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { createNovelService } from '@renderer/services/novelService'
import { createMockAiscribeAPI } from '../helpers/mock-api'
import type { Novel } from '@shared/types'
import type { CreateNovelData } from '@shared/types/ipc'

describe('createNovelService', () => {
  it('should delegate create to api.novelCreate', async () => {
    const api = createMockAiscribeAPI()
    const service = createNovelService(api)
    const data: CreateNovelData = { projectId: 'p1', title: 'Novel 1', author: '', synopsis: '', genre: '', tags: [], targetAudience: '' }
    const novel: Novel = { id: 'n1', ...data } as Novel
    vi.mocked(api.novelCreate).mockResolvedValue(novel)

    const result = await service.create(data)

    expect(api.novelCreate).toHaveBeenCalledWith(data)
    expect(result).toBe(novel)
  })

  it('should delegate get to api.novelGet', async () => {
    const api = createMockAiscribeAPI()
    const service = createNovelService(api)
    const novel: Novel = { id: 'n1', title: 'Novel 1' } as Novel
    vi.mocked(api.novelGet).mockResolvedValue(novel)

    const result = await service.get('n1')

    expect(api.novelGet).toHaveBeenCalledWith('n1')
    expect(result).toBe(novel)
  })

  it('should delegate getByProject to api.novelGetByProject', async () => {
    const api = createMockAiscribeAPI()
    const service = createNovelService(api)
    const novel: Novel = { id: 'n1', projectId: 'p1', title: 'Novel 1' } as Novel
    vi.mocked(api.novelGetByProject).mockResolvedValue(novel)

    const result = await service.getByProject('p1')

    expect(api.novelGetByProject).toHaveBeenCalledWith('p1')
    expect(result).toBe(novel)
  })
})
