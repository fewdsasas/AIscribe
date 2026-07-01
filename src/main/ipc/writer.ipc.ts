import type { IpcMain } from 'electron'
import { DATABASE_TOKEN, requireId, requireObject, wrap } from './index'
import type { ServiceRegistry } from '../di'
import type { IDatabase } from '../di'
import type { WriterProfile } from '../../shared/types'
import type { WriterModelGetData } from '../../shared/types/ipc'

export function registerWriterHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  ipcMain.handle(
    'writerModel:get',
    wrap(async (data: WriterModelGetData) => {
      requireObject(data, '查询数据')
      requireId(data.writerId, '作者ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getWriterModel(data.writerId)
    })
  )
  ipcMain.handle(
    'writerModel:save',
    wrap(async (profile: WriterProfile) => {
      requireObject(profile, '作者模型数据')
      requireId(profile.writerId, '作者ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      d.saveWriterModel(profile)
      return true
    })
  )
}
