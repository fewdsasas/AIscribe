import type { IpcMain } from 'electron'
import {
  LEARNING_ENGINE_TOKEN,
  requireId,
  requireNonEmptyString,
  requireNonNegativeNumber,
  requireObject,
  wrap
} from './index'
import { logger } from '../utils/logger'
import type { ServiceRegistry } from '../di'
import type { ILearningEngine } from '../di'
import type { RecordLearningData } from '../../shared/types/ipc'

export function registerLearningHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  ipcMain.handle(
    'learning:record',
    wrap(async (data: RecordLearningData) => {
      requireObject(data, '学习记录数据')
      requireId(data.projectId, '项目ID')
      requireId(data.sessionId, '会话ID')
      requireNonEmptyString(data.query, '查询内容')
      requireNonEmptyString(data.response, '响应内容')
      requireNonNegativeNumber(data.duration, '持续时间')
      if (data.context) {
        const serialized = JSON.stringify(data.context)
        if (serialized.length > 64 * 1024) {
          logger.warn(`[learning:record] context too large: ${serialized.length} bytes, truncating`)
          const maxPreview = 64 * 1024 - 128
          data.context = { truncated: true, originalSize: serialized.length, preview: serialized.slice(0, maxPreview) }
        }
      }
      const e = await services.resolveAsync<ILearningEngine>(LEARNING_ENGINE_TOKEN)
      await e.recordInteraction(data)
      return true
    })
  )
  ipcMain.handle(
    'learning:analyze',
    wrap(async (projectId: string) => {
      requireId(projectId, '项目ID')
      const e = await services.resolveAsync<ILearningEngine>(LEARNING_ENGINE_TOKEN)
      return e.analyzeProject(projectId)
    })
  )
  ipcMain.handle(
    'learning:summary',
    wrap(async (projectId: string) => {
      requireId(projectId, '项目ID')
      const e = await services.resolveAsync<ILearningEngine>(LEARNING_ENGINE_TOKEN)
      return e.getProjectSummary(projectId)
    })
  )
  ipcMain.handle(
    'memory:search',
    wrap(async (projectId: string, query: string) => {
      requireId(projectId, '项目ID')
      requireNonEmptyString(query, '搜索关键词')
      const e = await services.resolveAsync<ILearningEngine>(LEARNING_ENGINE_TOKEN)
      return e.getRecorder().searchMemory(projectId, query)
    })
  )
}
