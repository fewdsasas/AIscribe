import type { AiscribeAPI } from '@shared/types/electron'
import { getAiscribe } from './aiscribe-api'

export interface IMemoryService {
  getMemoryUsage(): Promise<{
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
    arrayBuffers: number
    dbSize: number
    timestamp: number
  }>
}

export function createMemoryService(api: AiscribeAPI): IMemoryService {
  return {
    getMemoryUsage: () => api.getMemoryUsage()
  }
}

const api = getAiscribe()
if (!api) {
  throw new Error('window.aiscribe is not available')
}

export const memoryService: IMemoryService = createMemoryService(api)
