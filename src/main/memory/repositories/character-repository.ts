import type { Database as SqlJsDatabase } from 'sql.js'
import { v4 as uuid } from 'uuid'
import type { Character } from '../../../shared/types'
import { BaseRepository } from './base-repository'
import { asOptionalNumber, asOptionalString, asString, buildRowMap, now, safeJsonParse } from './row-mapper'
import type { ICharacterRepository } from './repository-interfaces'

export class CharacterRepository extends BaseRepository implements ICharacterRepository {
  constructor(private sqlDb: SqlJsDatabase) {
    super()
  }

  protected get db(): SqlJsDatabase {
    return this.sqlDb
  }
  protected performSave(): void {}

  create(data: Partial<Omit<Character, 'id' | 'createdAt' | 'updatedAt'>> & { id?: string }): Character {
    const character: Character = {
      id: data.id ?? uuid(),
      novelId: data.novelId ?? '',
      name: data.name ?? '',
      aliases: data.aliases ?? [],
      role: data.role ?? 'minor',
      personality: data.personality ?? { traits: [], virtues: [], flaws: [], motivations: [], coreBelief: '' },
      background: data.background ?? '',
      appearance: data.appearance ?? '',
      abilities: data.abilities ?? [],
      goals: data.goals ?? [],
      fears: data.fears ?? [],
      secrets: data.secrets ?? [],
      arc: data.arc ?? { type: 'static', startingState: '', endingState: '', catalyst: '', keyMoments: [] },
      relationships: data.relationships ?? [],
      createdAt: now(),
      updatedAt: now()
    }
    this.sqlDb.run(
      `INSERT INTO characters (id, novel_id, name, aliases, role, age, gender, occupation,
        personality, background, appearance, abilities, goals, fears, secrets, arc, relationships,
        dialogue_voice, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        character.id,
        character.novelId,
        character.name,
        JSON.stringify(character.aliases),
        character.role,
        character.age ?? null,
        character.gender ?? null,
        character.occupation ?? null,
        JSON.stringify(character.personality),
        character.background,
        character.appearance,
        JSON.stringify(character.abilities),
        JSON.stringify(character.goals),
        JSON.stringify(character.fears),
        JSON.stringify(character.secrets),
        JSON.stringify(character.arc),
        JSON.stringify(character.relationships),
        character.dialogueVoice ?? null,
        character.notes ?? null,
        character.createdAt,
        character.updatedAt
      ]
    )
    this.scheduleSave()
    return character
  }

  listByNovel(novelId: string): Character[] {
    const result = this.sqlDb.exec('SELECT * FROM characters WHERE novel_id = ? ORDER BY created_at ASC', [novelId])
    if (result.length === 0 || result[0].values.length === 0) return []
    return result[0].values.map(row => this.rowToCharacter(row, result[0].columns))
  }

  private rowToCharacter(row: unknown[], columns: string[]): Character {
    const map = buildRowMap(row, columns)
    return {
      id: asString(map.id),
      novelId: asString(map.novel_id),
      name: asString(map.name),
      aliases: safeJsonParse<string[]>(map.aliases, []),
      role: asString(map.role) as Character['role'],
      age: asOptionalNumber(map.age),
      gender: asOptionalString(map.gender),
      occupation: asOptionalString(map.occupation),
      personality: safeJsonParse(map.personality, {
        traits: [],
        virtues: [],
        flaws: [],
        motivations: [],
        coreBelief: ''
      }),
      background: asString(map.background),
      appearance: asString(map.appearance),
      abilities: safeJsonParse<string[]>(map.abilities, []),
      goals: safeJsonParse<string[]>(map.goals, []),
      fears: safeJsonParse<string[]>(map.fears, []),
      secrets: safeJsonParse<string[]>(map.secrets, []),
      arc: safeJsonParse(map.arc, { type: 'static', startingState: '', endingState: '', catalyst: '', keyMoments: [] }),
      relationships: safeJsonParse(map.relationships, []),
      dialogueVoice: asOptionalString(map.dialogue_voice),
      notes: asOptionalString(map.notes),
      createdAt: asString(map.created_at),
      updatedAt: asString(map.updated_at)
    }
  }
}
