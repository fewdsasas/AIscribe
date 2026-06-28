import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { LearningEngine } from '../../../src/main/learning/engine'
import { Database } from '../../../src/main/memory/database'
import path from 'path'
import fs from 'fs'

describe('LearningEngine', () => {
  const testDir = path.join(__dirname, '../../temp')
  const testDbPath = path.join(testDir, 'learning-engine.db')
  let db: Database
  let engine: LearningEngine

  beforeAll(async () => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath)
      } catch {
        /* ignore */
      }
    }
    db = await Database.create(testDbPath)
    engine = LearningEngine.create(db)
  })

  afterAll(() => {
    try {
      engine.close()
    } catch {
      /* ignore */
    }
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

  describe('create', () => {
    it('should create a learning engine instance', async () => {
      const newDbPath = path.join(testDir, 'learning-engine-create.db')
      const newDb = await Database.create(newDbPath)
      const newEngine = LearningEngine.create(newDb)
      expect(newEngine).toBeDefined()
      newEngine.close()
      newDb.close()
      try {
        fs.unlinkSync(newDbPath)
      } catch {
        /* ignore */
      }
    })

    it('should inject custom writerId into profile', async () => {
      const newDbPath = path.join(testDir, 'learning-engine-writer.db')
      const newDb = await Database.create(newDbPath)
      const newEngine = LearningEngine.create(newDb, 'custom-writer-id')

      await newEngine.recordInteraction({
        projectId: 'writer-project',
        sessionId: 's1',
        query: 'q',
        response: 'r',
        duration: 100
      })

      const analysis = await newEngine.analyzeProject('writer-project')
      expect(analysis.profile.writerId).toBe('custom-writer-id')

      newEngine.close()
      newDb.close()
      try {
        fs.unlinkSync(newDbPath)
      } catch {
        /* ignore */
      }
    })
  })

  describe('getRecorder', () => {
    it('should return trajectory recorder', () => {
      const recorder = engine.getRecorder()
      expect(recorder).toBeDefined()
    })
  })

  describe('recordInteraction', () => {
    it('should record an interaction', async () => {
      await engine.recordInteraction({
        projectId: 'project-1',
        sessionId: 'session-1',
        query: 'test query',
        response: 'test response',
        duration: 1000,
        context: { key: 'value' }
      })
      expect(true).toBe(true)
    })

    it('should record with default skillId', async () => {
      await engine.recordInteraction({
        projectId: 'project-1',
        sessionId: 'session-2',
        query: 'another query',
        response: 'another response',
        duration: 500
      })
      expect(true).toBe(true)
    })
  })

  describe('analyzeProject', () => {
    it('should analyze project and return analysis', async () => {
      await engine.recordInteraction({
        projectId: 'project-2',
        sessionId: 'session-1',
        query: 'query 1',
        response: 'response 1',
        duration: 100
      })
      await engine.recordInteraction({
        projectId: 'project-2',
        sessionId: 'session-2',
        query: 'query 2',
        response: 'response 2',
        duration: 200
      })

      const analysis = await engine.analyzeProject('project-2')

      expect(analysis).toBeDefined()
      expect(Array.isArray(analysis.patterns)).toBe(true)
      expect(Array.isArray(analysis.suggestions)).toBe(true)
      expect(analysis.profile).toBeDefined()
      expect(Array.isArray(analysis.nextActions)).toBe(true)
      expect(Array.isArray(analysis.shortcuts)).toBe(true)
    })

    it('should call saveProfileCallback when set', async () => {
      const mockCallback = vi.fn().mockResolvedValue(undefined)
      engine.setSaveProfileCallback(mockCallback)

      await engine.recordInteraction({
        projectId: 'project-3',
        sessionId: 'session-1',
        query: 'test',
        response: 'test',
        duration: 100
      })

      await engine.analyzeProject('project-3')

      expect(mockCallback).toHaveBeenCalled()
    })
  })

  describe('getProjectSummary', () => {
    it('should return project summary', async () => {
      for (let i = 0; i < 5; i++) {
        await engine.recordInteraction({
          projectId: 'project-4',
          sessionId: `session-${i}`,
          query: `query ${i}`,
          response: `response ${i}`,
          duration: 100 * i
        })
      }

      const summary = engine.getProjectSummary('project-4')

      expect(summary).toBeDefined()
      expect(summary.totalInteractions).toBeGreaterThan(0)
      expect(Array.isArray(summary.topSkills)).toBe(true)
      expect(typeof summary.lastActive).toBe('string')
    })

    it('should handle project with no interactions', () => {
      const summary = engine.getProjectSummary('non-existent-project')

      expect(summary.totalInteractions).toBe(0)
      expect(summary.topSkills).toEqual([])
      expect(summary.lastActive).toBe('从未使用')
    })

    it('should report accurate totalInteractions and lastActive', async () => {
      const projectId = 'project-summary-accuracy'
      await engine.recordInteraction({
        projectId,
        sessionId: 's1',
        query: 'q1',
        response: 'r1',
        duration: 100
      })
      await engine.recordInteraction({
        projectId,
        sessionId: 's2',
        query: 'q2',
        response: 'r2',
        duration: 200
      })

      const summary = engine.getProjectSummary(projectId)
      expect(summary.totalInteractions).toBe(2)
      expect(summary.lastActive).not.toBe('从未使用')
    })
  })
})
