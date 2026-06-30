import type { IpcMain } from 'electron'
import { DATABASE_TOKEN, requireEnum, requireId, requireObject, wrap } from './index'
import type { ServiceRegistry } from '../di'
import type { IDatabase } from '../di'
import { ExportEngine, type ExportFormat } from '../export'

export function registerExportHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  ipcMain.handle(
    'export:project',
    wrap(async (options: { projectId: string; format: ExportFormat; includeSynopsis?: boolean }) => {
      requireObject(options, '导出选项')
      requireId(options.projectId, '项目ID')
      requireEnum(options.format, ['txt', 'markdown', 'html'], '导出格式')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      const ex = new ExportEngine(d)
      return ex.exportProject(options)
    })
  )
}
