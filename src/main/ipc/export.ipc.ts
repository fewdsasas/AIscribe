import type { IpcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types/ipc'
import { DATABASE_TOKEN, requireId, requireObject, wrap } from './index'
import type { ServiceRegistry } from '../di'
import type { IDatabase } from '../di'
import { ExportEngine, type ExportFormat } from '../export'

export function registerExportHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  ipcMain.handle(
    IPC_CHANNELS.EXPORT_PROJECT,
    wrap(async (options: { projectId: string; format: ExportFormat; includeSynopsis?: boolean }) => {
      requireObject(options, '导出选项')
      requireId(options.projectId, '项目ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      const ex = new ExportEngine(d)
      return ex.exportProject(options)
    })
  )
}
