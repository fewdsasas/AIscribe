import { describe, expect, it } from 'vitest'
import { PatternDetector } from '../../../src/main/learning/pattern-detector'
import type { TrajectoryEntry } from '../../../src/shared/types'

describe('PatternDetector', () => {
  const detector = new PatternDetector()

  const sampleTrajectories: TrajectoryEntry[] = [
    {
      id: '1',
      projectId: 'p1',
      sessionId: 's1',
      skillId: 'character-creation',
      query: '设计一个反派',
      response: '反派...',
      duration: 5000,
      timestamp: '2026-01-01T00:00:00Z',
      context: {}
    },
    {
      id: '2',
      projectId: 'p1',
      sessionId: 's2',
      skillId: 'character-creation',
      query: '设计一个女主角',
      response: '女主...',
      duration: 6000,
      timestamp: '2026-01-02T00:00:00Z',
      context: {}
    },
    {
      id: '3',
      projectId: 'p1',
      sessionId: 's3',
      skillId: 'world-building',
      query: '构建魔法体系',
      response: '魔法...',
      duration: 8000,
      timestamp: '2026-01-03T00:00:00Z',
      context: {}
    },
    {
      id: '4',
      projectId: 'p1',
      sessionId: 's4',
      skillId: 'character-creation',
      query: '设计一个配角',
      response: '配角...',
      duration: 4000,
      timestamp: '2026-01-04T00:00:00Z',
      context: {}
    },
    {
      id: '5',
      projectId: 'p1',
      sessionId: 's5',
      skillId: 'revision-polish',
      query: '润色这段对话',
      response: '润色...',
      duration: 3000,
      timestamp: '2026-01-05T00:00:00Z',
      context: {}
    },
    {
      id: '6',
      projectId: 'p1',
      sessionId: 's6',
      skillId: 'revision-polish',
      query: '润色这段描写',
      response: '润色...',
      duration: 3500,
      timestamp: '2026-01-06T00:00:00Z',
      context: {}
    },
    {
      id: '7',
      projectId: 'p1',
      sessionId: 's7',
      skillId: 'character-creation',
      query: '补充角色背景',
      response: '背景...',
      duration: 5000,
      timestamp: '2026-01-07T00:00:00Z',
      context: {}
    }
  ]

  it('should detect high-frequency skills', () => {
    const patterns = detector.analyze(sampleTrajectories)
    const charPattern = patterns.find(p => p.category === 'skill_frequency' && p.skillId === 'character-creation')
    expect(charPattern).toBeDefined()
    if (!charPattern) throw new Error('charPattern not found')
    expect(charPattern.frequency).toBeGreaterThanOrEqual(3)
  })

  it('should identify usage sequences (A → B patterns)', () => {
    // Need count >= 2 of the same sequence within same session
    const seqTrajs: TrajectoryEntry[] = [
      {
        id: '20',
        projectId: 'p3',
        sessionId: 'same-session',
        skillId: 'character-creation',
        query: '角色1',
        response: '...',
        duration: 1000,
        timestamp: '2026-03-01T10:00:00Z',
        context: {}
      },
      {
        id: '21',
        projectId: 'p3',
        sessionId: 'same-session',
        skillId: 'world-building',
        query: '世界1',
        response: '...',
        duration: 1000,
        timestamp: '2026-03-01T10:05:00Z',
        context: {}
      },
      {
        id: '22',
        projectId: 'p3',
        sessionId: 'same-session',
        skillId: 'character-creation',
        query: '角色2',
        response: '...',
        duration: 1000,
        timestamp: '2026-03-01T10:10:00Z',
        context: {}
      },
      {
        id: '23',
        projectId: 'p3',
        sessionId: 'same-session',
        skillId: 'world-building',
        query: '世界2',
        response: '...',
        duration: 1000,
        timestamp: '2026-03-01T10:15:00Z',
        context: {}
      }
    ]
    const patterns = detector.analyze(seqTrajs)
    const seqPatterns = patterns.filter(p => p.category === 'sequence')
    expect(seqPatterns.length).toBeGreaterThan(0)
  })

  it('should detect time-based patterns (clustering)', () => {
    // Create trajectories clustered in time
    const clusteredTrajs: TrajectoryEntry[] = [
      {
        id: '10',
        projectId: 'p2',
        sessionId: 's10',
        skillId: 'character-creation',
        query: '角色',
        response: '...',
        duration: 1000,
        timestamp: '2026-02-01T10:00:00Z',
        context: {}
      },
      {
        id: '11',
        projectId: 'p2',
        sessionId: 's11',
        skillId: 'character-creation',
        query: '角色',
        response: '...',
        duration: 1000,
        timestamp: '2026-02-01T10:05:00Z',
        context: {}
      },
      {
        id: '12',
        projectId: 'p2',
        sessionId: 's12',
        skillId: 'world-building',
        query: '世界',
        response: '...',
        duration: 1000,
        timestamp: '2026-02-01T10:10:00Z',
        context: {}
      }
    ]
    const patterns = detector.analyze(clusteredTrajs)
    expect(patterns.length).toBeGreaterThan(0)
    const timePatterns = patterns.filter(p => p.category === 'time_cluster')
    expect(timePatterns.length).toBeGreaterThan(0)
  })

  it('should assign confidence scores to patterns', () => {
    const patterns = detector.analyze(sampleTrajectories)
    for (const pattern of patterns) {
      expect(pattern.confidence).toBeGreaterThanOrEqual(0)
      expect(pattern.confidence).toBeLessThanOrEqual(1)
    }
  })

  it('should generate actionable suggestions from patterns', () => {
    const patterns = detector.analyze(sampleTrajectories)
    const suggestions = detector.generateSuggestions(patterns)
    expect(suggestions.length).toBeGreaterThan(0)
    // Suggestions should be useful strings
    expect(suggestions[0]).toBeTruthy()
    expect(typeof suggestions[0]).toBe('string')
  })
})
