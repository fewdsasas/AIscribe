import type { AiscribeAPI } from '@shared/types/electron'
import { getAiscribe } from './aiscribe-api'

export interface IStorageService {
  set(key: string, value: string): Promise<boolean>
  get(key: string): Promise<string | null>
  remove(key: string): Promise<boolean>
}

export function createStorageService(api: AiscribeAPI): IStorageService {
  return {
    set: async (key, value) => {
      try {
        const result = await api.secureStorageSet?.(key, value)
        return result?.success ?? false
      } catch {
        return false
      }
    },
    get: async key => {
      try {
        return (await api.secureStorageGet?.(key)) ?? null
      } catch {
        return null
      }
    },
    remove: async key => {
      try {
        const result = await api.secureStorageRemove?.(key)
        return result?.success ?? false
      } catch {
        return false
      }
    }
  }
}

const api = getAiscribe()
if (!api) {
  throw new Error('window.aiscribe is not available')
}

export const storageService: IStorageService = createStorageService(api)
