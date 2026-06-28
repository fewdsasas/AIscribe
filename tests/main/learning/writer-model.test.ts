import { describe, expect, it } from 'vitest'
import { WriterModelUpdater } from '../../../src/main/learning/writer-model'
import type { TrajectoryEntry } from '../../../src/shared/types'

describe('WriterModelUpdater', () => {
  const updater = new WriterModelUpdater('test-writer-id')

  const sampleTrajs: TrajectoryEntry[] = [
    {
      id: '1',
      projectId: 'p1',
      sessionId: 's1',
      skillId: 'character-creation',
      query: '设计一个INTJ型主角',
      response: '...',
      duration: 5000,
      timestamp: '2026-01-01T00:00:00Z',
      context: {}
    },
    {
      id: '2',
      projectId: 'p1',
      sessionId: 's2',
      skillId: 'character-creation',
      query: '设计一个ENTP型反派',
      response: '...',
      duration: 6000,
      timestamp: '2026-01-02T00:00:00Z',
      context: {}
    },
    {
      id: '3',
      projectId: 'p1',
      sessionId: 's3',
      skillId: 'story-structure',
      query: '用三幕剧规划故事',
      response: '...',
      duration: 8000,
      timestamp: '2026-01-03T00:00:00Z',
      context: {}
    },
    {
      id: '4',
      projectId: 'p1',
      sessionId: 's4',
      skillId: 'revision-polish',
      query: '润色',
      response: '...',
      duration: 3000,
      timestamp: '2026-01-04T00:00:00Z',
      context: {}
    },
    {
      id: '5',
      projectId: 'p1',
      sessionId: 's5',
      skillId: 'revision-polish',
      query: '再润色',
      response: '...',
      duration: 2000,
      timestamp: '2026-01-05T00:00:00Z',
      context: {}
    },
    {
      id: '6',
      projectId: 'p1',
      sessionId: 's6',
      skillId: 'anti-ai-rewrite',
      query: '检测AI味',
      response: '...',
      duration: 4000,
      timestamp: '2026-01-06T00:00:00Z',
      context: {}
    }
  ]

  it('should build a writer model from trajectories', () => {
    const model = updater.buildModel(sampleTrajs)
    expect(model.writerId).toBeTruthy()
    expect(model.frequentSkills).toBeDefined()
    expect(model.frequentSkills.length).toBeGreaterThan(0)
  })

  it('should use injected writerId instead of projectId', () => {
    const model = updater.buildModel(sampleTrajs)
    expect(model.writerId).toBe('test-writer-id')
    expect(model.writerId).not.toBe(sampleTrajs[0].projectId)
  })

  it('should identify most used skills', () => {
    const model = updater.buildModel(sampleTrajs)
    const topSkill = model.frequentSkills[0]
    // character-creation was used twice, should be in top skills
    expect(topSkill.skillId).toBeTruthy()
    expect(topSkill.count).toBeGreaterThanOrEqual(1)
  })

  it('should estimate writing style preferences', () => {
    const model = updater.buildModel(sampleTrajs)
    expect(model.stylePreferences).toBeDefined()
    expect(model.stylePreferences.preferredSkills.length).toBeGreaterThan(0)
    expect(model.stylePreferences.preferredSkills).toContain('character-creation')
  })

  it('should generate usage time distribution', () => {
    const model = updater.buildModel(sampleTrajs)
    expect(model.timeDistribution).toBeDefined()
    expect(model.timeDistribution.totalSessions).toBe(6)
    expect(model.timeDistribution.totalDuration).toBeGreaterThan(0)
  })

  it('should suggest next likely actions', () => {
    const model = updater.buildModel(sampleTrajs)
    const suggestions = updater.suggestNextActions(model)
    // After character-creation + story-structure, likely next: world-building
    expect(suggestions.length).toBeGreaterThan(0)
  })
})
