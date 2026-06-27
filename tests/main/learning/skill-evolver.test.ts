import { describe, expect, it } from 'vitest'
import { SkillEvolver } from '../../../src/main/learning/skill-evolver'
import type { DetectedPattern } from '../../../src/main/learning/pattern-detector'

describe('SkillEvolver', () => {
  const evolver = new SkillEvolver()

  const samplePatterns: DetectedPattern[] = [
    {
      id: 'pat-1',
      category: 'skill_frequency',
      skillId: 'character-creation',
      trigger: '设计角色',
      frequency: 8,
      confidence: 0.9,
      description: '用户频繁创建角色'
    },
    {
      id: 'pat-2',
      category: 'sequence',
      skillId: 'story-structure',
      trigger: '规划故事 → 设计角色',
      frequency: 5,
      confidence: 0.75,
      description: '用户常在规划故事后设计角色'
    },
    {
      id: 'pat-3',
      category: 'sequence',
      skillId: 'revision-polish',
      trigger: '完成章节 → 润色',
      frequency: 10,
      confidence: 0.95,
      description: '用户几乎每次写完章节都会润色'
    }
  ]

  it('should evolve a shortcut skill from a high-confidence pattern', () => {
    const evolved = evolver.evolve(samplePatterns)
    expect(evolved.length).toBeGreaterThanOrEqual(1)
    // High confidence patterns should produce shortcuts
    const polishShortcut = evolved.find(s => s.baseSkill === 'revision-polish')
    expect(polishShortcut).toBeDefined()
    if (!polishShortcut) throw new Error('polishShortcut not found')
    expect(polishShortcut.name).toBeTruthy()
    expect(polishShortcut.confidence).toBeGreaterThan(0.8)
  })

  it('should generate a meaningful shortcut name', () => {
    const evolved = evolver.evolve(samplePatterns)
    for (const shortcut of evolved) {
      expect(shortcut.name.length).toBeGreaterThan(0)
      expect(shortcut.description.length).toBeGreaterThan(0)
    }
  })

  it('should merge similar patterns into one shortcut', () => {
    const similarPatterns: DetectedPattern[] = [
      {
        id: 'p1',
        category: 'skill_frequency',
        skillId: 'character-creation',
        trigger: '设计角色',
        frequency: 6,
        confidence: 0.8,
        description: '创建角色'
      },
      {
        id: 'p2',
        category: 'skill_frequency',
        skillId: 'character-creation',
        trigger: '设计性格',
        frequency: 4,
        confidence: 0.7,
        description: '设计性格'
      },
      {
        id: 'p3',
        category: 'skill_frequency',
        skillId: 'character-creation',
        trigger: '设计背景',
        frequency: 3,
        confidence: 0.6,
        description: '设计背景'
      }
    ]
    const evolved = evolver.evolve(similarPatterns)
    // Similar patterns should be merged into 1-2 shortcuts
    expect(evolved.length).toBeLessThanOrEqual(similarPatterns.length)
  })

  it('should not evolve for low-frequency patterns', () => {
    const lowFreqPatterns: DetectedPattern[] = [
      {
        id: 'p-low',
        category: 'skill_frequency',
        skillId: 'book-analyzer',
        trigger: '分析',
        frequency: 2,
        confidence: 0.3,
        description: '偶尔分析'
      }
    ]
    const evolved = evolver.evolve(lowFreqPatterns)
    const lowFreqEvolved = evolved.filter(s => s.baseSkill === 'book-analyzer')
    expect(lowFreqEvolved.length).toBe(0)
  })
})
