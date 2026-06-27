import type { Database as SqlJsDatabase } from 'sql.js'
import { v4 as uuid } from 'uuid'
import type { Outline, OutlineSection } from '../../../shared/types'
import { BaseRepository } from './base-repository'
import { asNumber, asString, buildRowMap, now, safeJsonParse } from './row-mapper'
import type { IOutlineRepository } from './repository-interfaces'

export class OutlineRepository extends BaseRepository implements IOutlineRepository {
  constructor(private sqlDb: SqlJsDatabase) {
    super()
  }

  protected get db(): SqlJsDatabase {
    return this.sqlDb
  }
  protected performSave(): void {}

  getByNovel(novelId: string): Outline | null {
    const result = this.sqlDb.exec('SELECT * FROM outlines WHERE novel_id = ?', [novelId])
    if (result.length === 0 || result[0].values.length === 0) return null
    return this.rowToOutline(result[0].values[0], result[0].columns)
  }

  save(data: Partial<Omit<Outline, 'id' | 'createdAt' | 'updatedAt'>> & { id?: string }): Outline {
    const id = data.id ?? uuid()
    const nowStr = now()
    const outline: Outline = {
      id,
      novelId: data.novelId ?? '',
      type: data.type ?? 'brief',
      content: data.content ?? '',
      structure: data.structure ?? [],
      version: data.version ?? 1,
      createdAt: nowStr,
      updatedAt: nowStr
    }
    this.sqlDb.run(
      `INSERT OR REPLACE INTO outlines (id, novel_id, type, content, structure, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        outline.novelId,
        outline.type,
        outline.content,
        JSON.stringify(outline.structure),
        outline.version,
        nowStr,
        nowStr
      ]
    )
    this.scheduleSave()
    return outline
  }

  private rowToOutline(row: unknown[], columns: string[]): Outline {
    const map = buildRowMap(row, columns)
    return {
      id: asString(map.id),
      novelId: asString(map.novel_id),
      type: asString(map.type) as 'brief' | 'detailed',
      content: asString(map.content),
      structure: safeJsonParse<OutlineSection[]>(map.structure, []),
      version: asNumber(map.version),
      createdAt: asString(map.created_at),
      updatedAt: asString(map.updated_at)
    }
  }
}
