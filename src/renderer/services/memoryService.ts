import type { AiscribeAPI } from '@shared/types/electron'
import { getAiscribe } from './aiscribe-api'
import { logger } from '../utils/logger'

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

function createStubMemoryService(): IMemoryService {
  return {
    getMemoryUsage: async () => ({
      rss: 0,
      heapTotal: 0,
      heapUsed: 0,
      external: 0,
      arrayBuffers: 0,
      dbSize: 0,
      timestamp: Date.now()
    })
  }
}

const api = getAiscribe()
if (!api) {
  logger.warn('memoryService: window.aiscribe is not available, using stub')
}

export const memoryService: IMemoryService = api ? createMemoryService(api) : createStubMemoryService()
