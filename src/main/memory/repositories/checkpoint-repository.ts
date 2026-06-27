import type { Database as SqlJsDatabase } from 'sql.js'
import { v4 as uuid } from 'uuid'
import type { Checkpoint, CheckpointSnapshot } from '../../../shared/types'
import { BaseRepository } from './base-repository'
import { asString, buildRowMap, now, safeJsonParse } from './row-mapper'
import type { ICheckpointRepository } from './repository-interfaces'

export class CheckpointRepository extends BaseRepository implements ICheckpointRepository {
  constructor(private sqlDb: SqlJsDatabase) {
    super()
  }

  protected get db(): SqlJsDatabase {
    return this.sqlDb
  }
  protected performSave(): void {}

  create(data: Partial<Omit<Checkpoint, 'id' | 'createdAt'>> & { id?: string }): Checkpoint {
    const checkpoint: Checkpoint = {
      id: data.id ?? uuid(),
      projectId: data.projectId ?? '',
      label: data.label ?? '',
      description: data.description ?? '',
      snapshot: data.snapshot ?? { novel: '', characters: '', worlds: '', plots: '', outline: '' },
      tags: data.tags ?? [],
      createdAt: now()
    }
    this.sqlDb.run(
      `INSERT INTO checkpoints (id, project_id, label, description, snapshot, created_at, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        checkpoint.id,
        checkpoint.projectId,
        checkpoint.label,
        checkpoint.description,
        JSON.stringify(checkpoint.snapshot),
        checkpoint.createdAt,
        JSON.stringify(checkpoint.tags)
      ]
    )
    this.scheduleSave()
    return checkpoint
  }

  listByProject(projectId: string): Checkpoint[] {
    const result = this.sqlDb.exec(
      'SELECT id, project_id, label, description, created_at, tags FROM checkpoints WHERE project_id = ? ORDER BY created_at DESC',
      [projectId]
    )
    if (result.length === 0 || result[0].values.length === 0) return []
    return result[0].values.map(row => this.rowToListCheckpoint(row, result[0].columns))
  }

  getSnapshot(id: string): CheckpointSnapshot | null {
    const result = this.sqlDb.exec('SELECT snapshot FROM checkpoints WHERE id = ?', [id])
    if (result.length === 0 || result[0].values.length === 0) return null
    const raw = result[0].values[0][0] as string
    return JSON.parse(raw) as CheckpointSnapshot
  }

  private rowToListCheckpoint(row: unknown[], columns: string[]): Checkpoint {
    const map = buildRowMap(row, columns)
    return {
      id: asString(map.id),
      projectId: asString(map.project_id),
      label: asString(map.label),
      description: asString(map.description),
      snapshot: { novel: '', characters: '', worlds: '', plots: '', outline: '' },
      createdAt: asString(map.created_at),
      tags: safeJsonParse<string[]>(map.tags, [])
    }
  }
}
