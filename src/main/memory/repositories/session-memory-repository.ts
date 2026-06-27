import type { Database as SqlJsDatabase } from 'sql.js'
import { v4 as uuid } from 'uuid'
import type { SessionMemory, SessionQuery } from '../../../shared/types'
import { BaseRepository } from './base-repository'
import { asString, buildRowMap, now, safeJsonParse } from './row-mapper'
import type { ISessionMemoryRepository } from './repository-interfaces'

export class SessionMemoryRepository extends BaseRepository implements ISessionMemoryRepository {
  constructor(private sqlDb: SqlJsDatabase) {
    super()
  }

  protected get db(): SqlJsDatabase {
    return this.sqlDb
  }
  protected performSave(): void {}

  create(data: Partial<Omit<SessionMemory, 'id' | 'createdAt' | 'updatedAt'>> & { id?: string }): SessionMemory {
    const session: SessionMemory = {
      id: data.id ?? uuid(),
      projectId: data.projectId ?? '',
      sessionId: data.sessionId ?? '',
      queries: data.queries ?? [],
      summary: data.summary ?? '',
      createdAt: now(),
      updatedAt: now()
    }
    this.sqlDb.run(
      `INSERT INTO session_memories (id, project_id, session_id, queries, summary, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.projectId,
        session.sessionId,
        JSON.stringify(session.queries),
        session.summary,
        session.createdAt,
        session.updatedAt
      ]
    )
    this.scheduleSave()
    return session
  }

  listByProject(projectId: string): SessionMemory[] {
    const result = this.sqlDb.exec('SELECT * FROM session_memories WHERE project_id = ? ORDER BY created_at DESC', [
      projectId
    ])
    if (result.length === 0 || result[0].values.length === 0) return []
    return result[0].values.map(row => this.rowToSessionMemory(row, result[0].columns))
  }

  private rowToSessionMemory(row: unknown[], columns: string[]): SessionMemory {
    const map = buildRowMap(row, columns)
    return {
      id: asString(map.id),
      projectId: asString(map.project_id),
      sessionId: asString(map.session_id),
      queries: safeJsonParse<SessionQuery[]>(map.queries, []),
      summary: asString(map.summary),
      createdAt: asString(map.created_at),
      updatedAt: asString(map.updated_at)
    }
  }
}
