import type { IpcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types/ipc'
import { DATABASE_TOKEN, requireId, requireNonEmptyString, requireObject, wrap } from './index'
import type { ServiceRegistry } from '../di'
import type { IDatabase } from '../di'
import type { SaveOutlineData, SavePlotStructureData, SaveWorldData } from '../../shared/types/ipc'

export function registerWorldHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  ipcMain.handle(
    IPC_CHANNELS.PLOT_STRUCTURE_GET_BY_NOVEL,
    wrap(async (novelId: string) => {
      requireId(novelId, '小说ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getPlotStructureByNovel(novelId)
    })
  )
  ipcMain.handle(
    IPC_CHANNELS.PLOT_STRUCTURE_SAVE,
    wrap(async (data: SavePlotStructureData) => {
      requireObject(data, '情节结构数据')
      requireId(data.novelId, '小说ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.savePlotStructure(data)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.WORLD_GET_BY_NOVEL,
    wrap(async (novelId: string) => {
      requireId(novelId, '小说ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getWorldByNovel(novelId)
    })
  )
  ipcMain.handle(
    IPC_CHANNELS.WORLD_SAVE,
    wrap(async (data: SaveWorldData) => {
      requireObject(data, '世界观数据')
      requireId(data.novelId, '小说ID')
      requireNonEmptyString(data.name, '世界观名称')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.saveWorld(data)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.OUTLINE_GET,
    wrap(async (novelId: string) => {
      requireId(novelId, '小说ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getOutline(novelId)
    })
  )
  ipcMain.handle(
    IPC_CHANNELS.OUTLINE_SAVE,
    wrap(async (data: SaveOutlineData) => {
      requireObject(data, '大纲数据')
      requireId(data.novelId, '小说ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.saveOutline(data)
    })
  )
}
