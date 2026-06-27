import type { AiscribeAPI } from '@shared/types/electron'
import type { Outline } from '@shared/types'
import type { SaveOutlineData } from '@shared/types/ipc'
import { getAiscribe } from './aiscribe-api'

export interface IOutlineService {
  get(novelId: string): Promise<Outline | null>
  save(data: SaveOutlineData): Promise<Outline>
}

export function createOutlineService(api: AiscribeAPI): IOutlineService {
  return {
    get: novelId => api.outlineGet(novelId),
    save: data => api.outlineSave(data)
  }
}

const api = getAiscribe()
if (!api) {
  throw new Error('window.aiscribe is not available')
}

export const outlineService: IOutlineService = createOutlineService(api)
