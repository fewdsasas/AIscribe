import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import path from 'path'
import fs from 'fs'

vi.mock('electron', () => ({
  app: {
    getPath: () => path.join(__dirname, '../../../temp'),
    on: () => {}
  }
}))

import { Database } from '../../../../src/main/memory/database'
import { testId } from '../../../setup'

describe('CharacterRepository shape fallback', () => {
  const testDir = path.join(__dirname, '../../../temp')
  const testDbPath = path.join(testDir, `character-repo-${testId()}.db`)
  let db: Database

  beforeAll(async () => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }
    db = await Database.create(testDbPath)
  })

  afterAll(() => {
    try {
      db.close()
    } catch {
      /* ignore */
    }
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath)
      } catch {
        /* ignore */
      }
    }
  })

  it('should fill missing personality fields when stored as empty object', async () => {
    const project = await db.projects.create({ name: 'Shape Project', genre: 'fantasy', status: 'planning' })
    const novel = await db.novels.create({
      projectId: project.id,
      title: 'Shape Novel',
      author: 'Test',
      synopsis: '',
      genre: 'fantasy',
      tags: [],
      targetAudience: ''
    })

    // Directly insert a character with empty personality/arc JSON
    const sqlDb = (db as any).sqlDb
    sqlDb.run(
      `INSERT INTO characters (id, novel_id, name, aliases, role, personality, background, appearance,
        abilities, goals, fears, secrets, arc, relationships, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        '12345678-1234-1234-1234-123456789abc',
        novel.id,
        'Shape Char',
        '[]',
        'minor',
        '{}',
        '',
        '',
        '[]',
        '[]',
        '[]',
        '[]',
        '{}',
        '[]',
        new Date().toISOString(),
        new Date().toISOString()
      ]
    )

    const characters = db.characters.listByNovel(novel.id)
    expect(characters.length).toBe(1)
    const char = characters[0]
    expect(char.personality.traits).toEqual([])
    expect(char.personality.virtues).toEqual([])
    expect(char.personality.flaws).toEqual([])
    expect(char.personality.motivations).toEqual([])
    expect(char.personality.coreBelief).toBe('')
    expect(char.arc.type).toBe('static')
    expect(char.arc.startingState).toBe('')
    expect(char.arc.endingState).toBe('')
    expect(char.arc.catalyst).toBe('')
    expect(char.arc.keyMoments).toEqual([])
  })

  describe('write entrypoint', () => {
    it('should create character and clear cache without throwing', async () => {
      const project = await db.projects.create({ name: 'Cache Project', genre: 'fantasy', status: 'planning' })
      const novel = await db.novels.create({
        projectId: project.id,
        title: 'Cache Novel',
        author: 'Test',
        synopsis: '',
        genre: 'fantasy',
        tags: [],
        targetAudience: ''
      })

      const created = db.characters.create({ novelId: novel.id, name: 'Cache Char', role: 'protagonist' })
      expect(created.id).toBeDefined()

      const listed = db.characters.listByNovel(novel.id)
      expect(listed.length).toBe(1)
      expect(listed[0].name).toBe('Cache Char')
    })
  })
})
