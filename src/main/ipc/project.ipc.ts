import type { IpcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types/ipc'
import { DATABASE_TOKEN, requireId, requireNonEmptyString, requireObject, wrap } from './index'
import type { ServiceRegistry } from '../di'
import type { IDatabase } from '../di'
import type { CreateProjectData, UpdateProjectData } from '../../shared/types/ipc'

export function registerProjectHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  ipcMain.handle(
    IPC_CHANNELS.PROJECT_CREATE,
    wrap(async (data: CreateProjectData) => {
      requireObject(data, '项目数据')
      requireNonEmptyString(data.name, '项目名称')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.createProject(data)
    })
  )
  ipcMain.handle(
    IPC_CHANNELS.PROJECT_LIST,
    wrap(async () => {
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.listProjects()
    })
  )
  ipcMain.handle(
    IPC_CHANNELS.PROJECT_DASHBOARD_STATS,
    wrap(async () => {
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.listProjectsWithStats()
    })
  )
  ipcMain.handle(
    IPC_CHANNELS.PROJECT_GET,
    wrap(async (id: string) => {
      requireId(id, '项目ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getProject(id)
    })
  )
  ipcMain.handle(
    IPC_CHANNELS.PROJECT_UPDATE,
    wrap(async (id: string, data: UpdateProjectData) => {
      requireId(id, '项目ID')
      requireObject(data, '项目更新数据')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      d.updateProject(id, data)
      return true
    })
  )
  ipcMain.handle(
    IPC_CHANNELS.PROJECT_DELETE,
    wrap(async (id: string) => {
      requireId(id, '项目ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      d.deleteProject(id)
      return true
    })
  )
}
