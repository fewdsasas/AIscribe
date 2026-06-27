import type { Database as SqlJsDatabase } from 'sql.js'
import type { TrajectoryEntry } from '@shared/types'
import { BaseRepository } from './base-repository'
import { asNumber, asString, buildRowMap, now, safeJsonParse } from './row-mapper'
import type { ITrajectoryRepository } from './repository-interfaces'

function mapRowToEntry(row: unknown[], columns: string[]): TrajectoryEntry {
  const m = buildRowMap(row, columns)
  return {
    id: asString(m.id),
    projectId: asString(m.project_id),
    sessionId: asString(m.session_id),
    skillId: asString(m.skill_id),
    query: asString(m.query),
    response: asString(m.response),
    duration: asNumber(m.duration),
    timestamp: asString(m.timestamp),
    context: safeJsonParse(m.context, {})
  }
}

export class TrajectoryRepository extends BaseRepository implements ITrajectoryRepository {
  constructor(db: SqlJsDatabase) {
    super()
    this._db = db
  }
  private _db: SqlJsDatabase
  protected get db(): SqlJsDatabase {
    return this._db
  }

  record(data: Omit<TrajectoryEntry, 'id' | 'timestamp'>): TrajectoryEntry {
    const entry: TrajectoryEntry = {
      ...data,
      id: crypto.randomUUID(),
      timestamp: now()
    }
    this.run(
      `INSERT INTO trajectories (id, project_id, session_id, skill_id, query, response, duration, timestamp, context)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.projectId,
        entry.sessionId,
        entry.skillId,
        entry.query,
        entry.response,
        entry.duration,
        entry.timestamp,
        JSON.stringify(entry.context)
      ]
    )
    try {
      this.run(
        `INSERT INTO trajectories_fts (rowid, project_id, query, response, skill_id)
         VALUES (last_insert_rowid(), ?, ?, ?, ?)`,
        [entry.projectId, entry.query, entry.response, entry.skillId]
      )
    } catch {
      /* FTS5 not available */
    }
    return entry
  }

  getByProject(projectId: string, limit = 100): TrajectoryEntry[] {
    const result = this.queryOne('SELECT * FROM trajectories WHERE project_id = ? ORDER BY timestamp ASC LIMIT ?', [
      projectId,
      limit
    ])
    if (!result) return []
    return result.values.map(row => mapRowToEntry(row, result.columns))
  }

  getBySkill(skillId: string, limit = 50): TrajectoryEntry[] {
    const result = this.queryOne('SELECT * FROM trajectories WHERE skill_id = ? ORDER BY timestamp ASC LIMIT ?', [
      skillId,
      limit
    ])
    if (!result) return []
    return result.values.map(row => mapRowToEntry(row, result.columns))
  }

  getBySession(sessionId: string): TrajectoryEntry[] {
    const result = this.queryOne('SELECT * FROM trajectories WHERE session_id = ? ORDER BY timestamp ASC', [sessionId])
    if (!result) return []
    return result.values.map(row => mapRowToEntry(row, result.columns))
  }

  detectPatterns(projectId: string): { skillId: string; count: number; ratio: number }[] {
    const entries = this.getByProject(projectId, 1000)
    const total = entries.length
    if (total === 0) return []
    const skillCounts = new Map<string, number>()
    for (const entry of entries) {
      skillCounts.set(entry.skillId, (skillCounts.get(entry.skillId) ?? 0) + 1)
    }
    return Array.from(skillCounts.entries())
      .map(([skillId, count]) => ({ skillId, count, ratio: count / total }))
      .sort((a, b) => b.count - a.count)
  }

  searchMemory(projectId: string, query: string, limit = 20): TrajectoryEntry[] {
    if (!query.trim()) return []
    try {
      const sanitized = query.trim()
      if (!sanitized) return []
      const ftsQuery = sanitized
        .replace(/['"]/g, '')
        .replace(/[^\w\s\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (!ftsQuery) return []
      const result = this.queryOne(
        `SELECT t.* FROM trajectories t
         INNER JOIN trajectories_fts fts ON t.rowid = fts.rowid
         WHERE trajectories_fts MATCH ?
         AND t.project_id = ?
         ORDER BY rank
         LIMIT ?`,
        [ftsQuery, projectId, limit]
      )
      if (!result) return []
      return result.values.map(row => mapRowToEntry(row, result.columns))
    } catch {
      const pattern = `%${query}%`
      const result = this.queryOne(
        `SELECT * FROM trajectories
         WHERE project_id = ? AND (query LIKE ? OR response LIKE ?)
         ORDER BY timestamp DESC LIMIT ?`,
        [projectId, pattern, pattern, limit]
      )
      if (!result) return []
      return result.values.map(row => mapRowToEntry(row, result.columns))
    }
  }
}
