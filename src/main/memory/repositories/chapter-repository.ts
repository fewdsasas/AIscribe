import type { Database as SqlJsDatabase } from 'sql.js'
import { v4 as uuid } from 'uuid'
import type { Chapter, ChapterListPage, ChapterSummary } from '../../../shared/types'
import { BaseRepository } from './base-repository'
import { asNumber, asOptionalString, asString, buildRowMap, now } from './row-mapper'
import type { IChapterRepository } from './repository-interfaces'

const CHAPTER_CONTENT_CACHE_MAX_BYTES = 1024 * 1024 // 1MB

function estimateChapterSize(chapter: Chapter | ChapterSummary | ChapterListPage): number {
  if ('items' in chapter) {
    return chapter.items.reduce((sum, item) => sum + estimateChapterSize(item), 0)
  }
  const contentSize = 'content' in chapter && typeof chapter.content === 'string' ? chapter.content.length * 2 : 0
  const titleSize = chapter.title.length * 2
  return contentSize + titleSize + 256
}

export class ChapterRepository extends BaseRepository implements IChapterRepository {
  protected readonly cacheOptions = {
    max: 50,
    ttl: 60_000,
    sizeOf: estimateChapterSize,
    maxSize: 20 * 1024 * 1024 // 20MB
  }

  constructor(private sqlDb: SqlJsDatabase) {
    super()
  }

  protected get db(): SqlJsDatabase {
    return this.sqlDb
  }
  protected performSave(): void {}

  create(data: Partial<Omit<Chapter, 'id' | 'createdAt' | 'updatedAt'>> & { id?: string }): Chapter {
    const chapter: Chapter = {
      id: data.id ?? uuid(),
      novelId: data.novelId ?? '',
      title: data.title ?? '',
      content: data.content ?? '',
      sortOrder: data.sortOrder ?? 0,
      wordCount: data.wordCount ?? 0,
      status: data.status ?? 'draft',
      notes: data.notes,
      createdAt: now(),
      updatedAt: now()
    }
    this.sqlDb.run(
      `INSERT INTO chapters (id, novel_id, title, content, sort_order, word_count, status, created_at, updated_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        chapter.id,
        chapter.novelId,
        chapter.title,
        chapter.content,
        chapter.sortOrder,
        chapter.wordCount,
        chapter.status,
        chapter.createdAt,
        chapter.updatedAt,
        chapter.notes || null
      ]
    )
    this.clearCache()
    this.scheduleSave()
    return chapter
  }

  /**
   * 列表展示用：只返回不含 content 的精简字段，降低 sql.js 解析与 IPC 内存开销。
   */
  listByNovel(novelId: string): ChapterSummary[] {
    const cacheKey = `byNovel:${novelId}`
    const cached = this.cache.get(cacheKey) as ChapterSummary[] | undefined
    if (cached) return cached

    const result = this.sqlDb.exec(
      `SELECT id, novel_id, title, sort_order, word_count, status, created_at, updated_at, notes
       FROM chapters WHERE novel_id = ? ORDER BY sort_order ASC`,
      [novelId]
    )
    if (result.length === 0 || result[0].values.length === 0) return []
    const summaries = result[0].values.map(row => this.rowToChapterSummary(row, result[0].columns))
    this.cache.set(cacheKey, summaries)
    return summaries
  }

  /**
   * 分页列表：按 sort_order 排序，返回指定区间精简字段与总数。
   */
  listByNovelPaginated(novelId: string, offset: number, limit: number): ChapterListPage {
    const safeOffset = Math.max(0, offset)
    const safeLimit = Math.max(1, limit)
    const cacheKey = `byNovel:${novelId}:offset:${safeOffset}:limit:${safeLimit}`
    const cached = this.cache.get(cacheKey) as ChapterListPage | undefined
    if (cached) return cached

    const result = this.sqlDb.exec(
      `SELECT id, novel_id, title, sort_order, word_count, status, created_at, updated_at, notes
       FROM chapters WHERE novel_id = ? ORDER BY sort_order ASC LIMIT ? OFFSET ?`,
      [novelId, safeLimit, safeOffset]
    )
    const items =
      result.length === 0 || result[0].values.length === 0
        ? []
        : result[0].values.map(row => this.rowToChapterSummary(row, result[0].columns))
    const total = this.countByNovel(novelId)
    const page: ChapterListPage = { items, total, offset: safeOffset, limit: safeLimit }
    this.cache.set(cacheKey, page)
    return page
  }

  countByNovel(novelId: string): number {
    const result = this.sqlDb.exec('SELECT COUNT(*) as cnt FROM chapters WHERE novel_id = ?', [novelId])
    if (result.length === 0 || result[0].values.length === 0) return 0
    return Number(result[0].values[0][0])
  }

  /**
   * 完整章节列表（含 content），供阅读器/导出等需要正文内容的场景使用。
   */
  listByNovelWithContent(novelId: string): Chapter[] {
    const result = this.sqlDb.exec('SELECT * FROM chapters WHERE novel_id = ? ORDER BY sort_order ASC', [novelId])
    if (result.length === 0 || result[0].values.length === 0) return []
    return result[0].values.map(row => this.rowToChapter(row, result[0].columns))
  }

  getById(id: string): Chapter | null {
    const cacheKey = `byId:${id}`
    const cached = this.cache.get(cacheKey) as Chapter | undefined
    if (cached) return cached

    const result = this.sqlDb.exec('SELECT * FROM chapters WHERE id = ?', [id])
    if (result.length === 0 || result[0].values.length === 0) return null
    const chapter = this.rowToChapter(result[0].values[0], result[0].columns)
    // 超大正文不缓存，避免单个条目挤占缓存内存上限
    if (chapter.content.length * 2 <= CHAPTER_CONTENT_CACHE_MAX_BYTES) {
      this.cache.set(cacheKey, chapter)
    }
    return chapter
  }

  update(id: string, data: Partial<Omit<Chapter, 'id' | 'createdAt' | 'novelId'>>): void {
    const fields: string[] = []
    const values: unknown[] = []

    const fieldMap: Record<string, string> = {
      title: 'title',
      content: 'content',
      sortOrder: 'sort_order',
      wordCount: 'word_count',
      status: 'status',
      notes: 'notes'
    }

    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in data) {
        fields.push(`${col} = ?`)
        values.push((data as Record<string, unknown>)[key] ?? null)
      }
    }

    if (fields.length > 0) {
      fields.push('updated_at = ?')
      values.push(now())
      values.push(id)
      this.sqlDb.run(`UPDATE chapters SET ${fields.join(', ')} WHERE id = ?`, values)
      this.clearCache()
      this.scheduleSave()
    }
  }

  getChapterCounts(novelIds: string[]): Record<string, number> {
    if (novelIds.length === 0) return {}
    const placeholders = novelIds.map(() => '?').join(',')
    const result = this.sqlDb.exec(
      `SELECT novel_id, COUNT(*) as cnt FROM chapters WHERE novel_id IN (${placeholders}) GROUP BY novel_id`,
      novelIds
    )
    const counts: Record<string, number> = {}
    if (result.length > 0) {
      for (const row of result[0].values) {
        const colMap: Record<string, unknown> = {}
        result[0].columns.forEach((col, i) => {
          colMap[col] = row[i]
        })
        counts[colMap['novel_id'] as string] = colMap['cnt'] as number
      }
    }
    return counts
  }

  batchCreate(chapters: Omit<Chapter, 'createdAt' | 'updatedAt'>[]): Chapter[] {
    const created: Chapter[] = []
    this.sqlDb.run('BEGIN TRANSACTION')
    try {
      for (const data of chapters) {
        const chapter: Chapter = { ...data, createdAt: now(), updatedAt: now() }
        this.sqlDb.run(
          `INSERT INTO chapters (id, novel_id, title, content, sort_order, word_count, status, created_at, updated_at, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            chapter.id,
            chapter.novelId,
            chapter.title,
            chapter.content,
            chapter.sortOrder,
            chapter.wordCount,
            chapter.status,
            chapter.createdAt,
            chapter.updatedAt,
            chapter.notes || null
          ]
        )
        created.push(chapter)
      }
      this.sqlDb.run('COMMIT')
      this.clearCache()
      this.scheduleSave()
    } catch (e) {
      this.sqlDb.run('ROLLBACK')
      throw e
    }
    return created
  }

  private rowToChapter(row: unknown[], columns: string[]): Chapter {
    const map = buildRowMap(row, columns)
    return {
      id: asString(map.id),
      novelId: asString(map.novel_id),
      title: asString(map.title),
      content: asString(map.content),
      sortOrder: asNumber(map.sort_order),
      wordCount: asNumber(map.word_count),
      status: asString(map.status) as Chapter['status'],
      createdAt: asString(map.created_at),
      updatedAt: asString(map.updated_at),
      notes: asOptionalString(map.notes)
    }
  }

  private rowToChapterSummary(row: unknown[], columns: string[]): ChapterSummary {
    const map = buildRowMap(row, columns)
    return {
      id: asString(map.id),
      novelId: asString(map.novel_id),
      title: asString(map.title),
      sortOrder: asNumber(map.sort_order),
      wordCount: asNumber(map.word_count),
      status: asString(map.status) as ChapterSummary['status'],
      createdAt: asString(map.created_at),
      updatedAt: asString(map.updated_at),
      notes: asOptionalString(map.notes)
    }
  }
}
