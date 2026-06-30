import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import path from 'path'
import fs from 'fs'
import { Database } from '../../../src/main/memory/database'
import { testId } from '../../setup'

describe('SQL Injection Safety', () => {
  const testDir = path.join(__dirname, '../../temp')
  const testDbPath = path.join(testDir, `sql-injection-${testId()}.db`)
  let db: Database

  beforeAll(async () => {
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true })
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath)
      } catch {
        /* ignore */
      }
    }
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

  describe('repository updates ignore unknown/malicious fields', () => {
    it('should not inject SQL through project update unknown fields', () => {
      const projectId = testId()
      db.createProject({
        id: projectId,
        name: 'Safe Project',
        genre: 'fantasy',
        status: 'planning'
      })

      // Cast to bypass TypeScript: simulate a runtime attacker passing a malicious field.
      db.updateProject(projectId, {
        name: 'Updated Name',
        "name = 'hacked', status": 'writing'
      } as Parameters<Database['updateProject']>[1])

      const project = db.getProject(projectId)
      expect(project).not.toBeNull()
      if (!project) throw new Error('project not found')
      expect(project.name).toBe('Updated Name')
      expect(project.status).toBe('planning')
    })

    it('should not inject SQL through chapter update unknown fields', () => {
      const projectId = testId()
      const novelId = testId()
      const chapterId = testId()

      db.createProject({ id: projectId, name: 'Project', genre: 'fantasy', status: 'planning' })
      db.createNovel({ id: novelId, projectId, title: 'Novel' })
      db.createChapter({
        id: chapterId,
        novelId,
        title: 'Chapter 1',
        content: '',
        sortOrder: 0,
        status: 'draft'
      })

      // Attempt to smuggle a SQL fragment via an unknown field key.
      db.updateChapter(chapterId, {
        title: 'Safe Title',
        "title = 'hacked', status": 'published'
      } as Parameters<Database['updateChapter']>[1])

      const chapter = db.getChapter(chapterId)
      expect(chapter).not.toBeNull()
      if (!chapter) throw new Error('chapter not found')
      expect(chapter.title).toBe('Safe Title')
      expect(chapter.status).toBe('draft')
    })
  })

  describe('deleteProject uses table whitelist and parameterized IDs', () => {
    it('should not be affected by malicious project ID', () => {
      const maliciousId = `${testId()}' OR '1'='1`
      // The project does not exist; should not throw or affect other rows.
      expect(() => db.deleteProject(maliciousId)).not.toThrow()

      // Verify legitimate project creation/deletion still works.
      const projectId = testId()
      const novelId = testId()
      db.createProject({ id: projectId, name: 'Legit', genre: 'fantasy', status: 'planning' })
      db.createNovel({ id: novelId, projectId, title: 'Novel' })
      db.deleteProject(projectId)
      expect(db.getProject(projectId)).toBeNull()
      expect(db.getNovel(novelId)).toBeNull()
    })
  })
})
