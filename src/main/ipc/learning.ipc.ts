import type { IpcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types/ipc'
import { LEARNING_ENGINE_TOKEN, requireId, requireNonEmptyString, requireObject, wrap } from './index'
import type { ServiceRegistry } from '../di'
import type { ILearningEngine } from '../di'
import type { RecordLearningData } from '../../shared/types/ipc'

export function registerLearningHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  ipcMain.handle(
    IPC_CHANNELS.LEARNING_RECORD,
    wrap(async (data: RecordLearningData) => {
      requireObject(data, '学习记录数据')
      requireId(data.projectId, '项目ID')
      requireNonEmptyString(data.query, '查询内容')
      const e = await services.resolveAsync<ILearningEngine>(LEARNING_ENGINE_TOKEN)
      await e.recordInteraction(data)
      return true
    })
  )
  ipcMain.handle(
    IPC_CHANNELS.LEARNING_ANALYZE,
    wrap(async (projectId: string) => {
      requireId(projectId, '项目ID')
      const e = await services.resolveAsync<ILearningEngine>(LEARNING_ENGINE_TOKEN)
      return e.analyzeProject(projectId)
    })
  )
  ipcMain.handle(
    IPC_CHANNELS.LEARNING_SUMMARY,
    wrap(async (projectId: string) => {
      requireId(projectId, '项目ID')
      const e = await services.resolveAsync<ILearningEngine>(LEARNING_ENGINE_TOKEN)
      return e.getProjectSummary(projectId)
    })
  )
  ipcMain.handle(
    IPC_CHANNELS.MEMORY_SEARCH,
    wrap(async (projectId: string, query: string) => {
      requireId(projectId, '项目ID')
      requireNonEmptyString(query, '搜索关键词')
      const e = await services.resolveAsync<ILearningEngine>(LEARNING_ENGINE_TOKEN)
      return e.getRecorder().searchMemory(projectId, query)
    })
  )
}
