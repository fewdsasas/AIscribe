import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TrajectoryRecorder } from '../../../src/main/learning/trajectory'
import { Database } from '../../../src/main/memory/database'
import { testId } from '../../setup'
import path from 'path'
import fs from 'fs'

describe('TrajectoryRecorder', () => {
  const testDir = path.join(__dirname, '../temp')
  const testDbPath = path.join(testDir, `trajectory-${testId()}.db`)
  let db: Database
  let recorder: TrajectoryRecorder

  beforeAll(async () => {
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true })
    db = await Database.create(testDbPath)
    recorder = new TrajectoryRecorder(db)
  })

  afterAll(() => {
    try {
      if (recorder) recorder.close()
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

  it('should record a trajectory entry', async () => {
    const entry = await recorder.record({
      projectId: 'proj-1',
      sessionId: 'session-1',
      skillId: 'character-creation',
      query: '帮我设计一个反派角色',
      response: '反派角色设计如下...',
      context: { novelId: 'novel-1', chapterId: 'ch-3' },
      duration: 5000
    })
    expect(entry.id).toBeTruthy()
    expect(entry.skillId).toBe('character-creation')
    expect(entry.duration).toBe(5000)
  })

  it('should list trajectories for a project', async () => {
    await recorder.record({
      projectId: 'proj-1',
      sessionId: 'session-2',
      skillId: 'story-structure',
      query: '帮我搭建三幕剧',
      response: '三幕剧结构如下...',
      duration: 8000,
      context: {}
    })
    const entries = recorder.getProjectTrajectories('proj-1')
    expect(entries.length).toBe(2)
  })

  it('should compress similar trajectories', async () => {
    for (let i = 0; i < 5; i++) {
      await recorder.record({
        projectId: 'proj-2',
        sessionId: `session-compress-${i}`,
        skillId: 'revision-polish',
        query: `帮我润色这段文字 ${i}`,
        response: `润色结果 ${i}`,
        duration: 3000,
        context: {}
      })
    }
    const compressed = recorder.compressProject('proj-2')
    expect(compressed.originalCount).toBe(5)
    expect(compressed.compressedCount).toBe(5)
    expect(compressed.summary).toBeTruthy()
  })

  it('should detect repeated skill usage patterns', () => {
    const patterns = recorder.detectPatterns('proj-2')
    expect(patterns.length).toBeGreaterThan(0)
    const skillPattern = patterns.find(p => p.skillId === 'revision-polish')
    expect(skillPattern).toBeDefined()
    if (!skillPattern) throw new Error('skillPattern not found')
    expect(skillPattern.count).toBe(5)
  })

  it('should query trajectories by skill', async () => {
    const entries = recorder.getSkillTrajectories('story-structure')
    expect(entries.length).toBeGreaterThan(0)
    expect(entries.every(e => e.skillId === 'story-structure')).toBe(true)
  })

  it('should query trajectories by session', async () => {
    const entries = recorder.getSessionTrajectories('session-1')
    expect(entries.length).toBe(1)
    expect(entries[0].sessionId).toBe('session-1')
  })

  it('should search memory with query', async () => {
    const entries = recorder.searchMemory('proj-1', '反派')
    expect(entries.length).toBeGreaterThan(0)
  })

  it('should count trajectories by project', async () => {
    const count = recorder.countByProject('proj-1')
    expect(count).toBeGreaterThan(0)
  })

  it('should get last active timestamp by project', async () => {
    const lastActive = recorder.getLastActiveByProject('proj-1')
    expect(lastActive).toBeTruthy()
  })

  it('should compress multi-entry sessions to first and last', async () => {
    for (let i = 0; i < 3; i++) {
      await recorder.record({
        projectId: 'proj-multi',
        sessionId: 'shared-session',
        skillId: 'revision-polish',
        query: `query ${i}`,
        response: `response ${i}`,
        duration: 1000,
        context: {}
      })
    }
    const compressed = recorder.compressProject('proj-multi')
    expect(compressed.originalCount).toBe(3)
    expect(compressed.compressedCount).toBe(2)
    expect(compressed.summary).toContain('shared-session'.slice(0, 8))
  })

  it('should handle closed recorder gracefully', () => {
    const closedRecorder = new TrajectoryRecorder(db)
    closedRecorder.close()
    expect(closedRecorder.getProjectTrajectories('x')).toEqual([])
    expect(closedRecorder.getSkillTrajectories('x')).toEqual([])
    expect(closedRecorder.getSessionTrajectories('x')).toEqual([])
    expect(closedRecorder.searchMemory('x', 'q')).toEqual([])
    expect(closedRecorder.countByProject('x')).toBe(0)
    expect(closedRecorder.getLastActiveByProject('x')).toBeNull()
    expect(closedRecorder.detectPatterns('x')).toEqual([])
  })
})
