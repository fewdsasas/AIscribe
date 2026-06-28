import type { IpcMain } from 'electron'
import { DATABASE_TOKEN, requireId, requireNonEmptyString, requireObject, wrap } from './index'
import type { ServiceRegistry } from '../di'
import type { IDatabase } from '../di'
import type { CreateProjectData, UpdateProjectData } from '../../shared/types/ipc'

export function registerProjectHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  ipcMain.handle(
    'project:create',
    wrap(async (data: CreateProjectData) => {
      requireObject(data, '项目数据')
      requireNonEmptyString(data.name, '项目名称')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.createProject(data)
    })
  )
  ipcMain.handle(
    'project:list',
    wrap(async () => {
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.listProjects()
    })
  )
  ipcMain.handle(
    'project:dashboard-stats',
    wrap(async () => {
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.listProjectsWithStats()
    })
  )
  ipcMain.handle(
    'project:get',
    wrap(async (id: string) => {
      requireId(id, '项目ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getProject(id)
    })
  )
  ipcMain.handle(
    'project:update',
    wrap(async (id: string, data: UpdateProjectData) => {
      requireId(id, '项目ID')
      requireObject(data, '项目更新数据')
      if ('name' in data) requireNonEmptyString(data.name, '项目名称')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      d.updateProject(id, data)
      return true
    })
  )
  ipcMain.handle(
    'project:delete',
    wrap(async (id: string) => {
      requireId(id, '项目ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      d.deleteProject(id)
      return true
    })
  )
}
