import type { IDatabase, ILLMProvider } from '../di/service-interfaces'
import { aiStructureRepair, type RepairResult } from '../import/ai-structure-repair'
import type { ParsedNovel } from '../import/parser-types'

/**
 * 从数据库中构建 ParsedNovel 对象，用于 AI 结构修复。
 */
export function buildParsedNovelFromDB(d: IDatabase, novelId: string): ParsedNovel | null {
  const chapters = d.listChaptersWithContent(novelId)
  if (!chapters || chapters.length === 0) return null

  const novel = d.getNovel(novelId)

  return {
    title: novel?.title || '未命名小说',
    author: novel?.author || '',
    chapters: chapters.map(ch => ({
      title: ch.title,
      content: ch.content || '',
      wordCount: ch.wordCount || 0
    }))
  }
}

/** Options for write-back after repair */
export interface RepairWriteBackOptions {
  onProgress?: (current: number, total: number, action: string) => void
}

/**
 * 执行 AI 结构修复并将结果写回数据库。
 *
 * - 匹配已有章节进行 update
 * - 新增章节（split 场景）进行 create
 * - 多余章节（merge 场景）标记为 "(已合并)"
 *
 * @returns 修复结果
 */
export async function executeRepairWithWriteBack(
  d: IDatabase,
  llm: ILLMProvider,
  novelId: string,
  parsed: ParsedNovel,
  options: RepairWriteBackOptions = {}
): Promise<RepairResult> {
  const result = await aiStructureRepair(parsed, {
    llm,
    force: true,
    onProgress: options.onProgress
  })

  if (result.applied) {
    const existingChapters = d.listChaptersWithContent(novelId)

    for (let i = 0; i < result.novel.chapters.length; i++) {
      const repairedCh = result.novel.chapters[i]
      if (i < existingChapters.length) {
        // 更新已有章节
        d.updateChapter(existingChapters[i].id, {
          title: repairedCh.title,
          content: repairedCh.content,
          wordCount: repairedCh.wordCount
        })
      } else {
        // 新增章节（split 场景）
        d.createChapter({
          novelId,
          title: repairedCh.title,
          content: repairedCh.content,
          sortOrder: i,
          wordCount: repairedCh.wordCount,
          status: 'draft',
          notes: undefined
        })
      }
    }

    // 如果修复后章节数减少（merge 场景），标记多余章节
    if (result.novel.chapters.length < existingChapters.length) {
      for (let i = result.novel.chapters.length; i < existingChapters.length; i++) {
        d.updateChapter(existingChapters[i].id, { title: '(已合并)', content: '', wordCount: 0 })
      }
    }
  }

  return result
}
