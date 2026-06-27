// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { createLearningSlice } from '../../../src/renderer/store/learningSlice'

describe('LearningSlice', () => {
  it('should have empty suggestions initially', () => {
    const set = vi.fn()
    const slice = createLearningSlice(set as any, vi.fn() as any, vi.fn() as any)
    expect(slice.suggestions).toEqual([])
    expect(slice.nextActions).toEqual([])
    expect(slice.evolvedShortcuts).toEqual([])
  })

  it('should set suggestions', () => {
    const set = vi.fn()
    const slice = createLearningSlice(set as any, vi.fn() as any, vi.fn() as any)
    slice.setSuggestions(['Suggestion 1', 'Suggestion 2'])
    expect(set).toHaveBeenCalledWith({ suggestions: ['Suggestion 1', 'Suggestion 2'] })
  })

  it('should set next actions', () => {
    const set = vi.fn()
    const slice = createLearningSlice(set as any, vi.fn() as any, vi.fn() as any)
    const actions = [{ suggestedSkill: 'test', reason: 'test', confidence: 0.8 }]
    slice.setNextActions(actions)
    expect(set).toHaveBeenCalledWith({ nextActions: actions })
  })

  it('should set evolved shortcuts', () => {
    const set = vi.fn()
    const slice = createLearningSlice(set as any, vi.fn() as any, vi.fn() as any)
    const shortcuts = [{ name: 'test', description: 'test', baseSkill: 'test' }]
    slice.setEvolvedShortcuts(shortcuts)
    expect(set).toHaveBeenCalledWith({ evolvedShortcuts: shortcuts })
  })

  it('should clear learning state', () => {
    const set = vi.fn()
    const slice = createLearningSlice(set as any, vi.fn() as any, vi.fn() as any)
    slice.clearLearning()
    expect(set).toHaveBeenCalledWith({ suggestions: [], nextActions: [], evolvedShortcuts: [] })
  })
})
