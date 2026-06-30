import type { IpcMain } from 'electron'
import { DATABASE_TOKEN, requireId, requireNonEmptyString, requireObject, wrap } from './index'
import type { ServiceRegistry } from '../di'
import type { IDatabase } from '../di'
import type { CreateChapterData, CreateNovelData, UpdateChapterData } from '../../shared/types/ipc'

export function registerNovelHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  ipcMain.handle(
    'novel:create',
    wrap(async (data: CreateNovelData) => {
      requireObject(data, '小说数据')
      requireId(data.projectId, '项目ID')
      requireNonEmptyString(data.title, '小说标题')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.createNovel(data)
    })
  )
  ipcMain.handle(
    'novel:get',
    wrap(async (id: string) => {
      requireId(id, '小说ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getNovel(id)
    })
  )
  ipcMain.handle(
    'novel:get-by-project',
    wrap(async (projectId: string) => {
      requireId(projectId, '项目ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getNovelByProject(projectId)
    })
  )

  ipcMain.handle(
    'chapter:create',
    wrap(async (data: CreateChapterData) => {
      requireObject(data, '章节数据')
      requireNonEmptyString(data.title, '章节标题')
      requireId(data.novelId, '小说ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.createChapter(data)
    })
  )
  ipcMain.handle(
    'chapter:list',
    wrap(async (novelId: string) => {
      requireId(novelId, '小说ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.listChapters(novelId)
    })
  )
  ipcMain.handle(
    'chapter:list-with-content',
    wrap(async (novelId: string) => {
      requireId(novelId, '小说ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.listChaptersWithContent(novelId)
    })
  )
  ipcMain.handle(
    'chapter:counts',
    wrap(async (novelIds: string[]) => {
      if (!Array.isArray(novelIds)) throw new Error('novelIds 必须为数组')
      for (const id of novelIds) {
        requireId(id, '小说ID')
      }
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getChapterCounts(novelIds)
    })
  )
  ipcMain.handle(
    'chapter:get',
    wrap(async (id: string) => {
      requireId(id, '章节ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getChapter(id)
    })
  )
  ipcMain.handle(
    'chapter:update',
    wrap(async (id: string, data: UpdateChapterData) => {
      requireId(id, '章节ID')
      requireObject(data, '章节更新数据')
      if ('title' in data) requireNonEmptyString(data.title, '章节标题')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      d.updateChapter(id, data)
      return true
    })
  )
}
