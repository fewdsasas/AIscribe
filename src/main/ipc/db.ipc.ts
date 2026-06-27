import type { IpcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types/ipc'
import { DATABASE_TOKEN, wrap } from './index'
import type { ServiceRegistry } from '../di'
import type { IDatabase } from '../di'

export function registerDbHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  ipcMain.handle(
    IPC_CHANNELS.DB_TABLES,
    wrap(async () => {
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getTableNames()
    })
  )
}
