import type { IpcMain } from 'electron'
import { DATABASE_TOKEN, requireId, requireNonEmptyString, requireObject, wrap } from './index'
import type { ServiceRegistry } from '../di'
import type { IDatabase } from '../di'
import type {
  CreateProjectData,
  DeleteByIdData,
  GetByIdData,
  OperationResult,
  UpdateByIdData,
  UpdateProjectData
} from '../../shared/types/ipc'

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
    wrap(async (data: GetByIdData) => {
      requireObject(data, '查询数据')
      requireId(data.id, '项目ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getProject(data.id)
    })
  )
  ipcMain.handle(
    'project:update',
    wrap(async (data: UpdateByIdData<UpdateProjectData>): Promise<OperationResult> => {
      requireObject(data, '更新数据')
      requireId(data.id, '项目ID')
      requireObject(data.updates, '项目更新内容')
      if ('name' in data.updates) requireNonEmptyString(data.updates.name, '项目名称')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      d.updateProject(data.id, data.updates)
      return { success: true }
    })
  )
  ipcMain.handle(
    'project:delete',
    wrap(async (data: DeleteByIdData): Promise<OperationResult> => {
      requireObject(data, '删除数据')
      requireId(data.id, '项目ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      d.deleteProject(data.id)
      return { success: true }
    })
  )
}
