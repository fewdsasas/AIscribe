import type { AiscribeAPI } from '@shared/types/electron'
import type { Chapter, ChapterSummary } from '@shared/types'
import type { CreateChapterData, UpdateChapterData } from '@shared/types/ipc'
import { getAiscribe } from './aiscribe-api'

export interface IChapterService {
  list(novelId: string): Promise<ChapterSummary[]>
  listWithContent(novelId: string): Promise<Chapter[]>
  get(id: string): Promise<Chapter | null>
  create(data: CreateChapterData): Promise<Chapter>
  update(id: string, data: UpdateChapterData): Promise<boolean>
}

export function createChapterService(api: AiscribeAPI): IChapterService {
  return {
    list: novelId => api.chapterList(novelId),
    listWithContent: novelId => api.chapterListWithContent(novelId),
    get: id => api.chapterGet(id),
    create: data => api.chapterCreate(data),
    update: (id, data) => api.chapterUpdate(id, data)
  }
}

const api = getAiscribe()
if (!api) {
  throw new Error('window.aiscribe is not available')
}

export const chapterService: IChapterService = createChapterService(api)
