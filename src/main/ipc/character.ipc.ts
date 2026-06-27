import type { IpcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types/ipc'
import { DATABASE_TOKEN, requireId, requireNonEmptyString, requireObject, wrap } from './index'
import type { ServiceRegistry } from '../di'
import type { IDatabase } from '../di'
import type { CreateCharacterData } from '../../shared/types/ipc'

export function registerCharacterHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  ipcMain.handle(
    IPC_CHANNELS.CHARACTER_CREATE,
    wrap(async (data: CreateCharacterData) => {
      requireObject(data, '角色数据')
      requireNonEmptyString(data.name, '角色名称')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.createCharacter(data)
    })
  )
  ipcMain.handle(
    IPC_CHANNELS.CHARACTER_LIST,
    wrap(async (novelId: string) => {
      requireId(novelId, '小说ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.listCharacters(novelId)
    })
  )
}
