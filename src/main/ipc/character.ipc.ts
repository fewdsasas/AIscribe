import type { IpcMain } from 'electron'
import { DATABASE_TOKEN, requireEnum, requireId, requireNonEmptyString, requireObject, wrap } from './index'
import type { ServiceRegistry } from '../di'
import type { IDatabase } from '../di'
import type { CreateCharacterData } from '../../shared/types/ipc'

export function registerCharacterHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  ipcMain.handle(
    'character:create',
    wrap(async (data: CreateCharacterData) => {
      requireObject(data, '角色数据')
      requireNonEmptyString(data.name, '角色名称')
      requireId(data.novelId, '小说ID')
      requireEnum(
        data.role,
        [
          'protagonist',
          'antagonist',
          'supporting',
          'love_interest',
          'mentor',
          'sidekick',
          'foil',
          'confidant',
          'villain',
          'minor'
        ],
        '角色类型'
      )
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.createCharacter(data)
    })
  )
  ipcMain.handle(
    'character:list',
    wrap(async (novelId: string) => {
      requireId(novelId, '小说ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.listCharacters(novelId)
    })
  )
}
