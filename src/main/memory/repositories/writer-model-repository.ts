import type { Database as SqlJsDatabase } from 'sql.js'
import { BaseRepository } from './base-repository'
import { asString, buildRowMap, now, safeJsonParse } from './row-mapper'
import type { WriterProfile } from '../../../shared/types'
import type { IWriterModelRepository } from './repository-interfaces'

export class WriterModelRepository extends BaseRepository implements IWriterModelRepository {
  constructor(private sqlDb: SqlJsDatabase) {
    super()
  }

  protected get db(): SqlJsDatabase {
    return this.sqlDb
  }
  protected performSave(): void {}

  getByWriterId(writerId: string): WriterProfile | null {
    const result = this.query('SELECT * FROM writer_models WHERE writer_id = ?', [writerId])
    if (result.length === 0 || result[0].values.length === 0) return null
    return this.rowToWriterProfile(result[0].values[0], result[0].columns)
  }

  save(profile: WriterProfile): void {
    const updatedAt = now()
    this.run(
      `INSERT OR REPLACE INTO writer_models (writer_id, preferences, style_profile, habits, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        profile.writerId,
        JSON.stringify(profile.stylePreferences),
        JSON.stringify(profile.timeDistribution),
        JSON.stringify(profile.frequentSkills),
        now(),
        updatedAt
      ]
    )
    this.scheduleSave()
  }

  private rowToWriterProfile(row: unknown[], columns: string[]): WriterProfile {
    const map = buildRowMap(row, columns)
    return {
      writerId: asString(map.writer_id),
      frequentSkills: safeJsonParse<WriterProfile['frequentSkills']>(map.habits, []),
      stylePreferences: safeJsonParse<WriterProfile['stylePreferences']>(map.preferences, {
        preferredSkills: [],
        averageSessionDuration: 0,
        typicalQueryLength: 0
      }),
      timeDistribution: safeJsonParse<WriterProfile['timeDistribution']>(map.style_profile, {
        totalSessions: 0,
        totalDuration: 0,
        averagePerSession: 0,
        skillsUsed: []
      }),
      lastUpdated: asString(map.updated_at)
    }
  }
}
