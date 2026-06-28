import type { IpcMain } from 'electron'
import { DATABASE_TOKEN, requireEnum, requireId, requireNonEmptyString, requireObject, wrap } from './index'
import type { ServiceRegistry } from '../di'
import type { IDatabase } from '../di'
import type { SaveOutlineData, SavePlotStructureData, SaveWorldData } from '../../shared/types/ipc'

export function registerWorldHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  ipcMain.handle(
    'plot-structure:get-by-novel',
    wrap(async (novelId: string) => {
      requireId(novelId, '小说ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getPlotStructureByNovel(novelId)
    })
  )
  ipcMain.handle(
    'plot-structure:save',
    wrap(async (data: SavePlotStructureData) => {
      requireObject(data, '情节结构数据')
      requireId(data.novelId, '小说ID')
      requireEnum(
        data.framework,
        [
          'three_act',
          'hero_journey',
          'save_cat',
          'seven_point',
          'snowflake',
          'story_circle',
          'story_grid',
          'dramatica'
        ],
        '情节框架'
      )
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.savePlotStructure(data)
    })
  )

  ipcMain.handle(
    'world:get-by-novel',
    wrap(async (novelId: string) => {
      requireId(novelId, '小说ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getWorldByNovel(novelId)
    })
  )
  ipcMain.handle(
    'world:save',
    wrap(async (data: SaveWorldData) => {
      requireObject(data, '世界观数据')
      requireId(data.novelId, '小说ID')
      requireNonEmptyString(data.name, '世界观名称')
      requireEnum(data.type, ['fantasy', 'sci_fi', 'historical', 'modern', 'alternate_history', 'hybrid'], '世界观类型')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.saveWorld(data)
    })
  )

  ipcMain.handle(
    'outline:get',
    wrap(async (novelId: string) => {
      requireId(novelId, '小说ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getOutline(novelId)
    })
  )
  ipcMain.handle(
    'outline:save',
    wrap(async (data: SaveOutlineData) => {
      requireObject(data, '大纲数据')
      requireId(data.novelId, '小说ID')
      requireEnum(data.type, ['brief', 'detailed'], '大纲类型')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.saveOutline(data)
    })
  )
}
