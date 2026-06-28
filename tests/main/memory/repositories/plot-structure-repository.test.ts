import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Database } from '../../../../src/main/memory/database'
import { testId } from '../../../setup'
import path from 'path'
import fs from 'fs'

describe('PlotStructureRepository', () => {
  const testDir = path.join(__dirname, '../../../temp')
  const testDbPath = path.join(testDir, `plot-struct-repo-${testId()}.db`)
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

  it('should save and retrieve a plot structure', () => {
    const plot = db.plotStructures.save({
      novelId: 'novel-1',
      framework: 'three_act',
      beats: [
        {
          id: 'b1',
          name: 'Act 1',
          description: '',
          sortOrder: 1,
          chapterIds: [],
          emotionalIntensity: 5,
          status: 'planned'
        }
      ],
      notes: 'Test notes'
    })
    expect(plot).toBeDefined()
    expect(plot.framework).toBe('three_act')

    const found = db.plotStructures.getByNovel('novel-1')
    expect(found).toBeDefined()
    if (!found) throw new Error('found not set')
    expect(found.framework).toBe('three_act')
    expect(found.beats).toHaveLength(1)
  })

  it('should update an existing plot structure', () => {
    const saved = db.plotStructures.save({
      novelId: 'novel-2',
      framework: 'hero_journey',
      beats: [],
      notes: 'Initial'
    })
    db.plotStructures.save({
      id: saved.id,
      novelId: 'novel-2',
      framework: 'seven_point',
      beats: [],
      notes: 'Updated'
    })
    const found = db.plotStructures.getByNovel('novel-2')
    expect(found).toBeDefined()
    if (!found) throw new Error('found not set')
    expect(found.framework).toBe('seven_point')
    expect(found.notes).toBe('Updated')
  })

  it('should return null for non-existent novel', () => {
    const found = db.plotStructures.getByNovel('non-existent')
    expect(found).toBeNull()
  })

  it('should reject plot structure with missing chapter references', () => {
    const projectId = testId()
    const novelId = testId()
    db.createProject({
      id: projectId,
      name: 'Plot Test',
      description: '',
      genre: 'fantasy',
      status: 'planning',
      wordCount: 0
    })
    db.createNovel({
      id: novelId,
      projectId,
      title: 'Plot Novel',
      author: '',
      synopsis: '',
      genre: 'fantasy',
      tags: [],
      targetAudience: ''
    })

    expect(() =>
      db.plotStructures.save({
        novelId,
        framework: 'three_act',
        beats: [
          {
            id: 'b1',
            name: 'Act 1',
            description: '',
            sortOrder: 1,
            chapterIds: ['non-existent-chapter'],
            emotionalIntensity: 5,
            status: 'planned'
          }
        ],
        notes: ''
      })
    ).toThrow('情节 beat 引用了不存在的章节')
  })
})
