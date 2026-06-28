import type { IpcMain } from 'electron'
import { DATABASE_TOKEN, wrap } from './index'
import type { ServiceRegistry } from '../di'
import type { IDatabase } from '../di'

export function registerDbHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  ipcMain.handle(
    'db:tables',
    wrap(async () => {
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getTableNames()
    })
  )
}
