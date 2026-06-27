import type { Database as SqlJsDatabase } from 'sql.js'
import { v4 as uuid } from 'uuid'
import type { Novel } from '../../../shared/types'
import { BaseRepository } from './base-repository'
import { asString, buildRowMap, now, safeJsonParse } from './row-mapper'
import type { INovelRepository } from './repository-interfaces'

export class NovelRepository extends BaseRepository implements INovelRepository {
  constructor(private sqlDb: SqlJsDatabase) {
    super()
  }

  protected get db(): SqlJsDatabase {
    return this.sqlDb
  }
  protected performSave(): void {}

  create(data: Partial<Omit<Novel, 'id' | 'createdAt' | 'updatedAt'>> & { id?: string }): Novel {
    const novel: Novel = {
      id: data.id ?? uuid(),
      projectId: data.projectId ?? '',
      title: data.title ?? '',
      author: data.author ?? '',
      synopsis: data.synopsis ?? '',
      genre: data.genre ?? '',
      tags: data.tags ?? [],
      targetAudience: data.targetAudience ?? '',
      createdAt: now(),
      updatedAt: now()
    }
    this.sqlDb.run(
      `INSERT INTO novels (id, project_id, title, author, synopsis, genre, tags, target_audience, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        novel.id,
        novel.projectId,
        novel.title,
        novel.author,
        novel.synopsis,
        novel.genre,
        JSON.stringify(novel.tags),
        novel.targetAudience,
        novel.createdAt,
        novel.updatedAt
      ]
    )
    this.scheduleSave()
    return novel
  }

  getById(id: string): Novel | null {
    const result = this.sqlDb.exec('SELECT * FROM novels WHERE id = ?', [id])
    if (result.length === 0 || result[0].values.length === 0) return null
    return this.rowToNovel(result[0].values[0], result[0].columns)
  }

  getByProject(projectId: string): Novel | null {
    const result = this.sqlDb.exec('SELECT * FROM novels WHERE project_id = ?', [projectId])
    if (result.length === 0 || result[0].values.length === 0) return null
    return this.rowToNovel(result[0].values[0], result[0].columns)
  }

  private rowToNovel(row: unknown[], columns: string[]): Novel {
    const map = buildRowMap(row, columns)
    return {
      id: asString(map.id),
      projectId: asString(map.project_id),
      title: asString(map.title),
      author: asString(map.author),
      synopsis: asString(map.synopsis),
      genre: asString(map.genre),
      tags: safeJsonParse<string[]>(map.tags, []),
      targetAudience: asString(map.target_audience),
      createdAt: asString(map.created_at),
      updatedAt: asString(map.updated_at)
    }
  }
}
