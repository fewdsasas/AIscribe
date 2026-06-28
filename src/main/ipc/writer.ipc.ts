import type { IpcMain } from 'electron'
import { DATABASE_TOKEN, requireId, requireNonEmptyString, requireObject, wrap } from './index'
import type { ServiceRegistry } from '../di'
import type { IDatabase } from '../di'
import type { WriterProfile } from '../../shared/types'

export function registerWriterHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  ipcMain.handle(
    'writer-model:get',
    wrap(async (writerId: string) => {
      requireId(writerId, '作者ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getWriterModel(writerId)
    })
  )
  ipcMain.handle(
    'writer-model:save',
    wrap(async (profile: WriterProfile) => {
      requireObject(profile, '作者模型数据')
      requireNonEmptyString(profile.writerId, '作者ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      d.saveWriterModel(profile)
      return true
    })
  )
}
