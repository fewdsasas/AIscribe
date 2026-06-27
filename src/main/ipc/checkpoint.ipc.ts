import type { IpcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types/ipc'
import { DATABASE_TOKEN, requireId, requireNonEmptyString, requireObject, wrap } from './index'
import type { ServiceRegistry } from '../di'
import type { IDatabase } from '../di'
import type { CreateCheckpointData, CreateSessionData } from '../../shared/types/ipc'

export function registerCheckpointHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  ipcMain.handle(
    IPC_CHANNELS.CHECKPOINT_CREATE,
    wrap(async (data: CreateCheckpointData) => {
      requireObject(data, '检查点数据')
      requireNonEmptyString(data.label, '检查点标签')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.createCheckpoint(data)
    })
  )
  ipcMain.handle(
    IPC_CHANNELS.CHECKPOINT_LIST,
    wrap(async (projectId: string) => {
      requireId(projectId, '项目ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.listCheckpoints(projectId)
    })
  )
  ipcMain.handle(
    IPC_CHANNELS.CHECKPOINT_RESTORE,
    wrap(async (id: string) => {
      requireId(id, '检查点ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getCheckpointSnapshot(id)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.SESSION_CREATE,
    wrap(async (data: CreateSessionData) => {
      requireObject(data, '会话数据')
      // sessionId is optional, generated if not provided
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.createSessionMemory(data)
    })
  )
  ipcMain.handle(
    IPC_CHANNELS.SESSION_LIST,
    wrap(async (projectId: string) => {
      requireId(projectId, '项目ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.listSessionMemories(projectId)
    })
  )
}
