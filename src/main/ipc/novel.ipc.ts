import type { IpcMain } from 'electron'
import { v4 as uuid } from 'uuid'
import {
  DATABASE_TOKEN,
  LLM_PROVIDER_TOKEN,
  requireEnum,
  requireId,
  requireNonEmptyString,
  requireObject,
  wrap,
  wrapEvent
} from './index'
import type { ServiceRegistry } from '../di'
import type { IDatabase, ILLMProvider } from '../di'
import { SecureLLMConfig } from '../secure-config'
import { logger } from '../utils/logger'
import type {
  ChapterCountsData,
  CreateChapterData,
  CreateNovelData,
  GetByIdData,
  GetByNovelIdData,
  GetByProjectIdData,
  ImportNovelData,
  ImportNovelResult,
  OperationResult,
  UpdateByIdData,
  UpdateChapterData
} from '../../shared/types/ipc'
import { createDefaultNovelParser } from '../import/novel-parser'
import { aiStructureRepair, analyseConfidence } from '../import/ai-structure-repair'

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
    wrap(async (data: GetByIdData) => {
      requireObject(data, '查询数据')
      requireId(data.id, '小说ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getNovel(data.id)
    })
  )
  ipcMain.handle(
    'novel:get-by-project',
    wrap(async (data: GetByProjectIdData) => {
      requireObject(data, '查询数据')
      requireId(data.projectId, '项目ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getNovelByProject(data.projectId)
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
    wrap(async (data: GetByNovelIdData) => {
      requireObject(data, '查询数据')
      requireId(data.novelId, '小说ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.listChapters(data.novelId)
    })
  )
  ipcMain.handle(
    'chapter:list-with-content',
    wrap(async (data: GetByNovelIdData) => {
      requireObject(data, '查询数据')
      requireId(data.novelId, '小说ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.listChaptersWithContent(data.novelId)
    })
  )
  ipcMain.handle(
    'chapter:counts',
    wrap(async (data: ChapterCountsData) => {
      requireObject(data, '查询数据')
      if (!Array.isArray(data.novelIds)) throw new Error('novelIds 必须为数组')
      for (const id of data.novelIds) {
        requireId(id, '小说ID')
      }
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getChapterCounts(data.novelIds)
    })
  )
  ipcMain.handle(
    'chapter:get',
    wrap(async (data: GetByIdData) => {
      requireObject(data, '查询数据')
      requireId(data.id, '章节ID')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      return d.getChapter(data.id)
    })
  )
  ipcMain.handle(
    'chapter:update',
    wrap(async (data: UpdateByIdData<UpdateChapterData>): Promise<OperationResult> => {
      requireObject(data, '更新数据')
      requireId(data.id, '章节ID')
      requireObject(data.updates, '章节更新内容')
      if ('title' in data.updates) requireNonEmptyString(data.updates.title, '章节标题')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      d.updateChapter(data.id, data.updates)
      return { success: true }
    })
  )

  ipcMain.handle(
    'novel:import',
    wrapEvent(async (event, data: ImportNovelData): Promise<ImportNovelResult> => {
      requireObject(data, '导入数据')
      requireNonEmptyString(data.filePath, '文件路径')
      if (data.format) {
        requireEnum(data.format, ['txt', 'epub', 'docx', 'pdf'], '导入格式')
      }
      if (data.projectId) {
        requireId(data.projectId, '项目ID')
      }

      const parser = createDefaultNovelParser()
      const parsed = await parser.parseFile(data.filePath, data.format)

      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)

      let projectId = data.projectId
      if (!projectId) {
        const project = d.createProject({
          name: parsed.title || '导入作品',
          description: parsed.synopsis || '',
          genre: 'general'
        })
        projectId = project.id
      }

      const novel = d.createNovel({
        projectId,
        title: parsed.title || '未命名小说',
        author: parsed.author || '',
        synopsis: parsed.synopsis || '',
        genre: 'general',
        tags: []
      })

      const chapters = parsed.chapters.map((ch, index) => ({
        id: uuid(),
        novelId: novel.id,
        title: ch.title,
        content: ch.content,
        sortOrder: index,
        wordCount: ch.wordCount,
        status: 'draft' as const,
        notes: undefined
      }))

      if (chapters.length > 0) {
        d.createChaptersBatch(chapters)
      }

      const totalWordCount = parsed.chapters.reduce((sum, ch) => sum + ch.wordCount, 0)

      // 异步启动 AI 结构修复（如果 LLM 已配置且启发式置信度低）
      const sender = event.sender
      const llmConfigured = SecureLLMConfig.exists()
      if (llmConfigured) {
        const confidence = analyseConfidence(parsed)
        if (confidence.level === 'low') {
          // 异步后台修复，不阻塞返回
          setTimeout(async () => {
            try {
              const llm = await services.resolveAsync<ILLMProvider>(LLM_PROVIDER_TOKEN)

              sender.send('import:repair-progress', {
                novelId: novel.id,
                current: 0,
                total: parsed.chapters.length,
                action: 'AI 结构修复已自动启动...'
              })

              const result = await aiStructureRepair(parsed, {
                llm,
                force: true,
                onProgress: (current, total, action) => {
                  sender.send('import:repair-progress', { novelId: novel.id, current, total, action })
                }
              })

              if (result.applied) {
                const existingChapters = d.listChaptersWithContent(novel.id)
                for (let i = 0; i < result.novel.chapters.length; i++) {
                  const repairedCh = result.novel.chapters[i]
                  if (i < existingChapters.length) {
                    d.updateChapter(existingChapters[i].id, {
                      title: repairedCh.title,
                      content: repairedCh.content,
                      wordCount: repairedCh.wordCount
                    })
                  } else {
                    d.createChapter({
                      novelId: novel.id,
                      title: repairedCh.title,
                      content: repairedCh.content,
                      sortOrder: i,
                      wordCount: repairedCh.wordCount,
                      status: 'draft',
                      notes: undefined
                    })
                  }
                }
                // 合并场景：标记多余章节
                if (result.novel.chapters.length < existingChapters.length) {
                  for (let i = result.novel.chapters.length; i < existingChapters.length; i++) {
                    d.updateChapter(existingChapters[i].id, { title: '(已合并)', content: '', wordCount: 0 })
                  }
                }
              }

              sender.send('import:repair-done', {
                novelId: novel.id,
                actionsCount: result.actions.filter(a => a.type !== 'no_change').length
              })
            } catch (repairErr) {
              // 异步修复失败不阻塞整体导入，静默降级
              logger.warn('Background AI structure repair failed:', repairErr)
              sender.send('import:repair-done', { novelId: novel.id, actionsCount: 0 })
              sender.send('import:repair-error', {
                novelId: novel.id,
                message: `AI 结构修复失败: ${(repairErr as Error).message ?? '未知错误'}`
              })
            }
          }, 0)
        }
      }

      return {
        projectId,
        novelId: novel.id,
        title: novel.title,
        author: novel.author,
        chapterCount: chapters.length,
        totalWordCount
      }
    })
  )
}
