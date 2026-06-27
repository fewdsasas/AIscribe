import type { AiscribeAPI } from '@shared/types/electron'
import type { World } from '@shared/types'
import type { SaveWorldData } from '@shared/types/ipc'
import { getAiscribe } from './aiscribe-api'

export interface IWorldService {
  getByNovel(novelId: string): Promise<World | null>
  save(data: SaveWorldData): Promise<World>
}

export function createWorldService(api: AiscribeAPI): IWorldService {
  return {
    getByNovel: novelId => api.worldGetByNovel(novelId),
    save: data => api.worldSave(data)
  }
}

const api = getAiscribe()
if (!api) {
  throw new Error('window.aiscribe is not available')
}

export const worldService: IWorldService = createWorldService(api)
