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
import type {
  LearningAnalyzeData,
  LearningSummaryData,
  MemorySearchData,
  OperationResult,
  RecordLearningData
} from '../../shared/types/ipc'

export function registerLearningHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  ipcMain.handle(
    'learning:record',
    wrap(async (data: RecordLearningData): Promise<OperationResult> => {
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
      return { success: true }
    })
  )
  ipcMain.handle(
    'learning:analyze',
    wrap(async (data: LearningAnalyzeData) => {
      requireObject(data, '分析数据')
      requireId(data.projectId, '项目ID')
      const e = await services.resolveAsync<ILearningEngine>(LEARNING_ENGINE_TOKEN)
      return e.analyzeProject(data.projectId)
    })
  )
  ipcMain.handle(
    'learning:summary',
    wrap(async (data: LearningSummaryData) => {
      requireObject(data, '总结数据')
      requireId(data.projectId, '项目ID')
      const e = await services.resolveAsync<ILearningEngine>(LEARNING_ENGINE_TOKEN)
      return e.getProjectSummary(data.projectId)
    })
  )
  ipcMain.handle(
    'memory:search',
    wrap(async (data: MemorySearchData) => {
      requireObject(data, '搜索数据')
      requireId(data.projectId, '项目ID')
      requireNonEmptyString(data.query, '搜索关键词')
      const e = await services.resolveAsync<ILearningEngine>(LEARNING_ENGINE_TOKEN)
      return e.getRecorder().searchMemory(data.projectId, data.query)
    })
  )
}
