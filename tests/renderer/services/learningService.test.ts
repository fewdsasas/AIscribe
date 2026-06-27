// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { createLearningService } from '@renderer/services/learningService'
import { createMockAiscribeAPI } from '../helpers/mock-api'
import type { LearningAnalysisResult, RecordLearningData } from '@shared/types/ipc'

describe('createLearningService', () => {
  it('should delegate record to api.learningRecord', async () => {
    const api = createMockAiscribeAPI()
    const service = createLearningService(api)
    const data: RecordLearningData = {
      projectId: 'p1',
      sessionId: 's1',
      skillId: 'general-chat',
      query: 'hello',
      response: 'hi',
      duration: 100
    }
    vi.mocked(api.learningRecord).mockResolvedValue(true)

    const result = await service.record(data)

    expect(api.learningRecord).toHaveBeenCalledWith(data)
    expect(result).toBe(true)
  })

  it('should delegate analyze to api.learningAnalyze', async () => {
    const api = createMockAiscribeAPI()
    const service = createLearningService(api)
    const resultData: LearningAnalysisResult = {
      patterns: [],
      suggestions: ['s1'],
      nextActions: [{ suggestedSkill: 'skill', reason: 'r', confidence: 0.9 }],
      shortcuts: [{ name: 'sc', description: 'd', baseSkill: 'skill' }]
    }
    vi.mocked(api.learningAnalyze).mockResolvedValue(resultData)

    const result = await service.analyze('p1')

    expect(api.learningAnalyze).toHaveBeenCalledWith('p1')
    expect(result).toBe(resultData)
  })
})
