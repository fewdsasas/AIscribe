import type { AiscribeAPI } from '@shared/types/electron'
import { getAiscribe } from './aiscribe-api'

export interface IStorageService {
  set(key: string, value: string): Promise<boolean>
  get(key: string): Promise<string | null>
  remove(key: string): Promise<boolean>
}

export function createStorageService(api: AiscribeAPI): IStorageService {
  return {
    set: (key, value) => api.secureStorageSet?.(key, value) ?? Promise.resolve(false),
    get: key => api.secureStorageGet?.(key) ?? Promise.resolve(null),
    remove: key => api.secureStorageRemove?.(key) ?? Promise.resolve(false)
  }
}

const api = getAiscribe()
if (!api) {
  throw new Error('window.aiscribe is not available')
}

export const storageService: IStorageService = createStorageService(api)
