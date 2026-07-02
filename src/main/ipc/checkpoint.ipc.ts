import type { IpcMain } from 'electron'
import { DATABASE_TOKEN, requireId, requireNonEmptyString, requireObject, wrap } from './index'
import type { ServiceRegistry } from '../di'
import type { IDatabase } from '../di'
import type {
  CheckpointListData,
  CheckpointRestoreData,
  CreateCheckpointData,
  CreateSessionData,
  SessionListData
} from '../../shared/types/ipc'

export function registerCheckpointHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  ipcMain.handle(
    'checkpoint:create',
    wrap(async (data: CreateCheckpointData) => {
      requireObject(data, '检查点数据')
      requireNonEmptyString(data.label, '检查点标签')
      requireId(data.projectId, '项目ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.createCheckpoint(data)
    })
  )
  ipcMain.handle(
    'checkpoint:list',
    wrap(async (data: CheckpointListData) => {
      requireObject(data, '查询数据')
      requireId(data.projectId, '项目ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.listCheckpoints(data.projectId)
    })
  )
  ipcMain.handle(
    'checkpoint:restore',
    wrap(async (data: CheckpointRestoreData) => {
      requireObject(data, '恢复数据')
      requireId(data.id, '检查点ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getCheckpointSnapshot(data.id)
    })
  )

  ipcMain.handle(
    'session:create',
    wrap(async (data: CreateSessionData) => {
      requireObject(data, '会话数据')
      requireId(data.projectId, '项目ID')
      // sessionId is optional, generated if not provided
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.createSessionMemory(data)
    })
  )
  ipcMain.handle(
    'session:list',
    wrap(async (data: SessionListData) => {
      requireObject(data, '查询数据')
      requireId(data.projectId, '项目ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.listSessionMemories(data.projectId)
    })
  )
}
