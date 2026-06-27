import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Database } from '../../../../src/main/memory/database'
import { testId } from '../../../setup'
import path from 'path'
import fs from 'fs'

describe('WriterModelRepository', () => {
  const testDir = path.join(__dirname, '../../../temp')
  const testDbPath = path.join(testDir, `writer-model-repo-${testId()}.db`)
  let db: Database

  beforeAll(async () => {
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true })
    db = await Database.create(testDbPath)
  })

  afterAll(() => {
    try {
      if (db) db.close()
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

  it('should save and retrieve a writer profile', () => {
    const profile = {
      writerId: 'writer-1',
      frequentSkills: [{ skillId: 'character-design', count: 5, lastUsed: new Date().toISOString() }],
      stylePreferences: { preferredSkills: [], averageSessionDuration: 30, typicalQueryLength: 100 },
      timeDistribution: { totalSessions: 5, totalDuration: 150, averagePerSession: 30, skillsUsed: [] },
      lastUpdated: new Date().toISOString()
    }
    db.writerModels.save(profile)
    const found = db.writerModels.getByWriterId('writer-1')
    expect(found).toBeDefined()
    if (!found) throw new Error('found not set')
    expect(found.writerId).toBe('writer-1')
    expect(found.frequentSkills[0].skillId).toBe('character-design')
  })

  it('should update an existing writer profile', () => {
    db.writerModels.save({
      writerId: 'writer-2',
      frequentSkills: [{ skillId: 'plotting', count: 3, lastUsed: new Date().toISOString() }],
      stylePreferences: { preferredSkills: [], averageSessionDuration: 20, typicalQueryLength: 50 },
      timeDistribution: { totalSessions: 1, totalDuration: 20, averagePerSession: 20, skillsUsed: [] },
      lastUpdated: new Date().toISOString()
    })
    db.writerModels.save({
      writerId: 'writer-2',
      frequentSkills: [
        { skillId: 'world-building', count: 7, lastUsed: new Date().toISOString() },
        { skillId: 'plotting', count: 3, lastUsed: new Date().toISOString() }
      ],
      stylePreferences: { preferredSkills: [], averageSessionDuration: 25, typicalQueryLength: 60 },
      timeDistribution: { totalSessions: 2, totalDuration: 50, averagePerSession: 25, skillsUsed: [] },
      lastUpdated: new Date().toISOString()
    })
    const found = db.writerModels.getByWriterId('writer-2')
    expect(found).toBeDefined()
    if (!found) throw new Error('found not set')
    expect(found.frequentSkills[0].skillId).toBe('world-building')
  })

  it('should return null for non-existent writer', () => {
    const found = db.writerModels.getByWriterId('non-existent')
    expect(found).toBeNull()
  })
})
