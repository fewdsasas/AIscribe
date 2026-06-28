import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Database } from '../../../../src/main/memory/database'
import { testId } from '../../../setup'
import path from 'path'
import fs from 'fs'

describe('OutlineRepository', () => {
  const testDir = path.join(__dirname, '../../../temp')
  const testDbPath = path.join(testDir, `outline-repo-${testId()}.db`)
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

  it('should preserve createdAt and increment version on update', () => {
    const projectId = testId()
    const novelId = testId()
    db.createProject({
      id: projectId,
      name: 'Outline Test',
      description: '',
      genre: 'fantasy',
      status: 'planning',
      wordCount: 0
    })
    db.createNovel({
      id: novelId,
      projectId,
      title: 'Outline Novel',
      author: '',
      synopsis: '',
      genre: 'fantasy',
      tags: [],
      targetAudience: ''
    })

    const first = db.outlines.save({
      novelId,
      type: 'brief',
      content: 'First draft',
      structure: []
    })
    expect(first.version).toBe(1)

    const second = db.outlines.save({
      novelId,
      type: 'detailed',
      content: 'Second draft',
      structure: [
        { id: 's1', title: 'Setup', content: '', sortOrder: 1, wordCount: 0, phase: 'beginning', keyPoints: [] }
      ]
    })

    expect(second.id).toBe(first.id)
    expect(second.createdAt).toBe(first.createdAt)
    expect(second.version).toBe(first.version + 1)
    expect(second.type).toBe('detailed')
    expect(second.content).toBe('Second draft')
  })

  it('should create independent outlines for different novels', () => {
    const projectId = testId()
    const novelId1 = testId()
    const novelId2 = testId()
    db.createProject({
      id: projectId,
      name: 'Outline Test 2',
      description: '',
      genre: 'fantasy',
      status: 'planning',
      wordCount: 0
    })
    db.createNovel({
      id: novelId1,
      projectId,
      title: 'Novel 1',
      author: '',
      synopsis: '',
      genre: 'fantasy',
      tags: [],
      targetAudience: ''
    })
    db.createNovel({
      id: novelId2,
      projectId,
      title: 'Novel 2',
      author: '',
      synopsis: '',
      genre: 'fantasy',
      tags: [],
      targetAudience: ''
    })

    const outline1 = db.outlines.save({ novelId: novelId1, type: 'brief', content: 'One', structure: [] })
    const outline2 = db.outlines.save({ novelId: novelId2, type: 'brief', content: 'Two', structure: [] })

    expect(outline1.id).not.toBe(outline2.id)
    expect(db.outlines.getByNovel(novelId1)?.content).toBe('One')
    expect(db.outlines.getByNovel(novelId2)?.content).toBe('Two')
  })
})
