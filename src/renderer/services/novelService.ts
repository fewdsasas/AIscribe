import type { AiscribeAPI } from '@shared/types/electron'
import type { Novel } from '@shared/types'
import type { CreateNovelData } from '@shared/types/ipc'
import { getAiscribe } from './aiscribe-api'

export interface INovelService {
  create(data: CreateNovelData): Promise<Novel>
  get(id: string): Promise<Novel | null>
  getByProject(projectId: string): Promise<Novel | null>
}

export function createNovelService(api: AiscribeAPI): INovelService {
  return {
    create: data => api.novelCreate(data),
    get: id => api.novelGet(id),
    getByProject: projectId => api.novelGetByProject(projectId)
  }
}

const api = getAiscribe()
if (!api) {
  throw new Error('window.aiscribe is not available')
}

export const novelService: INovelService = createNovelService(api)
