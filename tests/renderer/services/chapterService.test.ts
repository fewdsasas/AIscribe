// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { createChapterService } from '@renderer/services/chapterService'
import { createMockAiscribeAPI } from '../helpers/mock-api'
import type { Chapter, ChapterSummary } from '@shared/types'
import type { UpdateChapterData } from '@shared/types/ipc'

describe('createChapterService', () => {
  it('should delegate list to api.chapterList', async () => {
    const api = createMockAiscribeAPI()
    const service = createChapterService(api)
    const chapters: ChapterSummary[] = [
      {
        id: 'c1',
        novelId: 'n1',
        title: 'Chapter 1',
        sortOrder: 0,
        wordCount: 0,
        status: 'draft',
        createdAt: '',
        updatedAt: ''
      }
    ]
    vi.mocked(api.chapterList).mockResolvedValue(chapters)

    const result = await service.list('n1')

    expect(api.chapterList).toHaveBeenCalledWith('n1')
    expect(result).toBe(chapters)
  })

  it('should delegate get to api.chapterGet', async () => {
    const api = createMockAiscribeAPI()
    const service = createChapterService(api)
    const chapter: Chapter = {
      id: 'c1',
      novelId: 'n1',
      title: 'Chapter 1',
      content: '{}',
      sortOrder: 0,
      wordCount: 0,
      status: 'draft',
      createdAt: '',
      updatedAt: ''
    }
    vi.mocked(api.chapterGet).mockResolvedValue(chapter)

    const result = await service.get('c1')

    expect(api.chapterGet).toHaveBeenCalledWith('c1')
    expect(result).toBe(chapter)
  })

  it('should delegate update to api.chapterUpdate', async () => {
    const api = createMockAiscribeAPI()
    const service = createChapterService(api)
    vi.mocked(api.chapterUpdate).mockResolvedValue(true)

    const data: UpdateChapterData = { content: '{}' }
    const result = await service.update('c1', data)

    expect(api.chapterUpdate).toHaveBeenCalledWith('c1', { content: '{}' })
    expect(result).toBe(true)
  })
})
