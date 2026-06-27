import type { Database as SqlJsDatabase } from 'sql.js'
import { v4 as uuid } from 'uuid'
import type { Project } from '../../../shared/types'
import { BaseRepository } from './base-repository'
import { asNumber, asOptionalNumber, asOptionalString, asString, buildRowMap, now } from './row-mapper'
import type { IProjectRepository } from './repository-interfaces'

export class ProjectRepository extends BaseRepository implements IProjectRepository {
  constructor(private sqlDb: SqlJsDatabase) {
    super()
  }

  protected get db(): SqlJsDatabase {
    return this.sqlDb
  }

  protected performSave(): void {
    // Save is handled by the parent Database class
  }

  create(data: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>> & { id?: string }): Project {
    const project: Project = {
      ...data,
      id: data.id ?? uuid(),
      name: data.name ?? '',
      description: data.description ?? '',
      genre: data.genre ?? '',
      status: data.status ?? 'planning',
      wordCount: data.wordCount ?? 0,
      createdAt: now(),
      updatedAt: now()
    }
    this.sqlDb.run(
      `INSERT INTO projects (id, name, description, cover, genre, created_at, updated_at, status, word_count, target_word_count, novel_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        project.id,
        project.name,
        project.description,
        project.cover || null,
        project.genre,
        project.createdAt,
        project.updatedAt,
        project.status,
        project.wordCount,
        project.targetWordCount || null,
        project.novelId || null
      ]
    )
    this.scheduleSave()
    return project
  }

  getById(id: string): Project | null {
    const result = this.sqlDb.exec('SELECT * FROM projects WHERE id = ?', [id])
    if (result.length === 0 || result[0].values.length === 0) return null
    return this.rowToProject(result[0].values[0], result[0].columns)
  }

  list(): Project[] {
    const result = this.sqlDb.exec('SELECT * FROM projects ORDER BY updated_at DESC')
    if (result.length === 0 || result[0].values.length === 0) return []
    return result[0].values.map(row => this.rowToProject(row, result[0].columns))
  }

  /** Whitelist of allowed update fields (snake_case -> camelCase) */
  private static readonly UPDATE_FIELD_MAP = new Map<keyof Omit<Project, 'id' | 'createdAt'>, string>([
    ['name', 'name'],
    ['description', 'description'],
    ['cover', 'cover'],
    ['genre', 'genre'],
    ['status', 'status'],
    ['wordCount', 'word_count'],
    ['targetWordCount', 'target_word_count'],
    ['novelId', 'novel_id']
  ])

  update(id: string, data: Partial<Omit<Project, 'id' | 'createdAt'>>): void {
    const fields: string[] = []
    const values: unknown[] = []

    for (const [camelKey, snakeCol] of ProjectRepository.UPDATE_FIELD_MAP) {
      if (camelKey in data) {
        fields.push(`${snakeCol} = ?`)
        values.push((data as Record<string, unknown>)[camelKey] ?? null)
      }
    }

    if (fields.length === 0) return

    fields.push('updated_at = ?')
    values.push(now())
    values.push(id)
    this.sqlDb.run(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, values)
    this.scheduleSave()
  }

  delete(id: string): void {
    this.sqlDb.run('DELETE FROM projects WHERE id = ?', [id])
    this.scheduleSave()
  }

  batchCreate(projects: Omit<Project, 'createdAt' | 'updatedAt'>[]): Project[] {
    const created: Project[] = []
    this.sqlDb.run('BEGIN TRANSACTION')
    try {
      for (const data of projects) {
        const project: Project = { ...data, createdAt: now(), updatedAt: now() }
        this.sqlDb.run(
          `INSERT INTO projects (id, name, description, cover, genre, created_at, updated_at, status, word_count, target_word_count, novel_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            project.id,
            project.name,
            project.description,
            project.cover || null,
            project.genre,
            project.createdAt,
            project.updatedAt,
            project.status,
            project.wordCount,
            project.targetWordCount || null,
            project.novelId || null
          ]
        )
        created.push(project)
      }
      this.sqlDb.run('COMMIT')
      this.scheduleSave()
    } catch (e) {
      this.sqlDb.run('ROLLBACK')
      throw e
    }
    return created
  }

  /** Aggregate query: projects with novel/chapter counts in one shot */
  listWithStats(): Array<Project & { novelCount: number; chapterCount: number }> {
    const sql = `
      SELECT
        p.id, p.name, p.description, p.cover, p.genre,
        p.created_at, p.updated_at, p.status, p.word_count,
        p.target_word_count, p.novel_id,
        COUNT(DISTINCT n.id) AS novel_count,
        COUNT(DISTINCT c.id) AS chapter_count
      FROM projects p
      LEFT JOIN novels n ON n.project_id = p.id
      LEFT JOIN chapters c ON c.novel_id = n.id
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `
    const result = this.sqlDb.exec(sql)
    if (result.length === 0 || result[0].values.length === 0) return []
    return result[0].values.map(row => {
      const map = buildRowMap(row, result[0].columns)
      return {
        ...this.rowToProject(row, result[0].columns),
        novelCount: asNumber(map.novel_count),
        chapterCount: asNumber(map.chapter_count)
      }
    })
  }

  private rowToProject(row: unknown[], columns: string[]): Project {
    const map = buildRowMap(row, columns)
    return {
      id: asString(map.id),
      name: asString(map.name),
      description: asString(map.description),
      cover: asOptionalString(map.cover),
      genre: asString(map.genre),
      createdAt: asString(map.created_at),
      updatedAt: asString(map.updated_at),
      status: asString(map.status) as Project['status'],
      wordCount: asNumber(map.word_count),
      targetWordCount: asOptionalNumber(map.target_word_count),
      novelId: asOptionalString(map.novel_id)
    }
  }
}
