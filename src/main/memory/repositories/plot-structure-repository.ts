import type { Database as SqlJsDatabase } from 'sql.js'
import { v4 as uuid } from 'uuid'
import type { PlotBeat, PlotStructure } from '../../../shared/types'
import { BaseRepository } from './base-repository'
import { asString, buildRowMap, safeJsonParse } from './row-mapper'
import type { IPlotStructureRepository } from './repository-interfaces'

export class PlotStructureRepository extends BaseRepository implements IPlotStructureRepository {
  constructor(private sqlDb: SqlJsDatabase) {
    super()
  }

  protected get db(): SqlJsDatabase {
    return this.sqlDb
  }
  protected performSave(): void {}

  getByNovel(novelId: string): PlotStructure | null {
    const result = this.sqlDb.exec('SELECT * FROM plot_structures WHERE novel_id = ?', [novelId])
    if (result.length === 0 || result[0].values.length === 0) return null
    return this.rowToPlotStructure(result[0].values[0], result[0].columns)
  }

  save(data: Partial<Omit<PlotStructure, 'id'>> & { id?: string }): PlotStructure {
    const id = data.id ?? uuid()
    const plot: PlotStructure = {
      id,
      novelId: data.novelId ?? '',
      framework: data.framework ?? 'three_act',
      beats: data.beats ?? [],
      notes: data.notes ?? ''
    }

    // Validate that all referenced chapter IDs exist and belong to this novel
    const chapterIds = new Set<string>()
    for (const beat of plot.beats) {
      if (beat.chapterIds) {
        for (const chapterId of beat.chapterIds) {
          chapterIds.add(chapterId)
        }
      }
    }
    if (chapterIds.size > 0) {
      const placeholders = Array.from(chapterIds)
        .map(() => '?')
        .join(',')
      const result = this.sqlDb.exec(`SELECT id FROM chapters WHERE id IN (${placeholders}) AND novel_id = ?`, [
        ...Array.from(chapterIds),
        plot.novelId
      ])
      const foundIds = new Set<string>()
      if (result.length > 0) {
        for (const row of result[0].values) {
          foundIds.add(String(row[0]))
        }
      }
      const missing = Array.from(chapterIds).filter(cid => !foundIds.has(cid))
      if (missing.length > 0) {
        throw new Error(`情节 beat 引用了不存在的章节: ${missing.join(', ')}`)
      }
    }

    this.run(
      `INSERT OR REPLACE INTO plot_structures (id, novel_id, framework, beats, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [id, plot.novelId, plot.framework, JSON.stringify(plot.beats), plot.notes]
    )
    this.scheduleSave()
    return plot
  }

  private rowToPlotStructure(row: unknown[], columns: string[]): PlotStructure {
    const map = buildRowMap(row, columns)
    return {
      id: asString(map.id),
      novelId: asString(map.novel_id),
      framework: asString(map.framework) as PlotStructure['framework'],
      beats: safeJsonParse<PlotBeat[]>(map.beats, []),
      notes: asString(map.notes)
    }
  }
}
