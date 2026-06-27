import type { IpcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types/ipc'
import { DATABASE_TOKEN, requireId, requireNonEmptyString, requireObject, wrap } from './index'
import type { ServiceRegistry } from '../di'
import type { IDatabase } from '../di'
import type { CreateChapterData, CreateNovelData, UpdateChapterData } from '../../shared/types/ipc'

export function registerNovelHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  ipcMain.handle(
    IPC_CHANNELS.NOVEL_CREATE,
    wrap(async (data: CreateNovelData) => {
      requireObject(data, '小说数据')
      requireNonEmptyString(data.title, '小说标题')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.createNovel(data)
    })
  )
  ipcMain.handle(
    IPC_CHANNELS.NOVEL_GET,
    wrap(async (id: string) => {
      requireId(id, '小说ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getNovel(id)
    })
  )
  ipcMain.handle(
    IPC_CHANNELS.NOVEL_GET_BY_PROJECT,
    wrap(async (projectId: string) => {
      requireId(projectId, '项目ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getNovelByProject(projectId)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.CHAPTER_CREATE,
    wrap(async (data: CreateChapterData) => {
      requireObject(data, '章节数据')
      requireNonEmptyString(data.title, '章节标题')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.createChapter(data)
    })
  )
  ipcMain.handle(
    IPC_CHANNELS.CHAPTER_LIST,
    wrap(async (novelId: string) => {
      requireId(novelId, '小说ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.listChapters(novelId)
    })
  )
  ipcMain.handle(
    IPC_CHANNELS.CHAPTER_LIST_WITH_CONTENT,
    wrap(async (novelId: string) => {
      requireId(novelId, '小说ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.listChaptersWithContent(novelId)
    })
  )
  ipcMain.handle(
    IPC_CHANNELS.CHAPTER_COUNTS,
    wrap(async (novelIds: string[]) => {
      if (!Array.isArray(novelIds)) throw new Error('novelIds 必须为数组')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getChapterCounts(novelIds)
    })
  )
  ipcMain.handle(
    IPC_CHANNELS.CHAPTER_GET,
    wrap(async (id: string) => {
      requireId(id, '章节ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getChapter(id)
    })
  )
  ipcMain.handle(
    IPC_CHANNELS.CHAPTER_UPDATE,
    wrap(async (id: string, data: UpdateChapterData) => {
      requireId(id, '章节ID')
      requireObject(data, '章节更新数据')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      d.updateChapter(id, data)
      return true
    })
  )
}
