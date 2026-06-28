import type { Database as SqlJsDatabase } from 'sql.js'
import { v4 as uuid } from 'uuid'
import type {
  ConsistencyCheck,
  Economy,
  Geography,
  PowerSystem,
  Society,
  World,
  WorldHistory
} from '../../../shared/types'
import { BaseRepository } from './base-repository'
import { asString, buildRowMap, now, safeJsonParse, safeJsonParseWithShape } from './row-mapper'
import type { IWorldRepository } from './repository-interfaces'

export class WorldRepository extends BaseRepository implements IWorldRepository {
  constructor(private sqlDb: SqlJsDatabase) {
    super()
  }

  protected get db(): SqlJsDatabase {
    return this.sqlDb
  }
  protected performSave(): void {}

  getByNovel(novelId: string): World | null {
    const result = this.sqlDb.exec('SELECT * FROM worlds WHERE novel_id = ?', [novelId])
    if (result.length === 0 || result[0].values.length === 0) return null
    return this.rowToWorld(result[0].values[0], result[0].columns)
  }

  save(data: Partial<Omit<World, 'id' | 'createdAt' | 'updatedAt'>> & { id?: string }): World {
    if (!data.novelId) throw new Error('novelId 不能为空')
    const id = data.id ?? uuid()
    const nowStr = now()
    const world: World = {
      id,
      novelId: data.novelId ?? '',
      name: data.name ?? '',
      type: data.type ?? 'fantasy',
      geography: data.geography ?? { description: '', climate: '', keyLocations: [] },
      history: data.history ?? [],
      society: data.society ?? { government: '', socialClasses: [], laws: [], culture: '', dailyLife: '' },
      technology: data.technology ?? 'medieval',
      economy: data.economy ?? { currency: '', resources: [], trade: '', occupations: [] },
      consistency: data.consistency ?? [],
      createdAt: nowStr,
      updatedAt: nowStr
    }
    this.run(
      `INSERT OR REPLACE INTO worlds (id, novel_id, name, type, geography, history, society, power_system, technology, economy, consistency, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        world.id,
        world.novelId,
        world.name,
        world.type,
        JSON.stringify(world.geography),
        JSON.stringify(world.history),
        JSON.stringify(world.society),
        world.powerSystem ? JSON.stringify(world.powerSystem) : null,
        world.technology,
        JSON.stringify(world.economy),
        JSON.stringify(world.consistency),
        world.createdAt,
        world.updatedAt
      ]
    )
    this.scheduleSave()
    return world
  }

  private rowToWorld(row: unknown[], columns: string[]): World {
    const map = buildRowMap(row, columns)
    return {
      id: asString(map.id),
      novelId: asString(map.novel_id),
      name: asString(map.name),
      type: asString(map.type) as World['type'],
      geography: safeJsonParse<Geography>(map.geography, { description: '', climate: '', keyLocations: [] }),
      history: safeJsonParse<WorldHistory[]>(map.history, []),
      society: safeJsonParse<Society>(map.society, {
        government: '',
        socialClasses: [],
        laws: [],
        culture: '',
        dailyLife: ''
      }),
      powerSystem: map.power_system
        ? safeJsonParseWithShape<PowerSystem>(map.power_system, {
            name: '',
            rules: [],
            limitations: [],
            costs: [],
            source: ''
          })
        : undefined,
      technology: asString(map.technology) as World['technology'],
      economy: safeJsonParse<Economy>(map.economy, { currency: '', resources: [], trade: '', occupations: [] }),
      consistency: safeJsonParse<ConsistencyCheck[]>(map.consistency, []),
      createdAt: asString(map.created_at),
      updatedAt: asString(map.updated_at)
    }
  }
}
