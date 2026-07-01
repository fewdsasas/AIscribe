import type { StateCreator } from 'zustand'

const MAX_SUGGESTIONS = 100

export interface NextActionSuggestion {
  suggestedSkill: string
  reason: string
  confidence: number
}

export interface LearningSlice {
  suggestions: string[]
  nextActions: NextActionSuggestion[]
  evolvedShortcuts: { name: string; description: string; baseSkill: string }[]
  setSuggestions: (suggestions: string[]) => void
  setNextActions: (actions: NextActionSuggestion[]) => void
  setEvolvedShortcuts: (shortcuts: { name: string; description: string; baseSkill: string }[]) => void
  clearLearning: () => void
}

export const createLearningSlice: StateCreator<LearningSlice, [], [], LearningSlice> = set => ({
  suggestions: [],
  nextActions: [],
  evolvedShortcuts: [],

  setSuggestions: suggestions => set({ suggestions: suggestions.slice(0, MAX_SUGGESTIONS) }),
  setNextActions: nextActions => set({ nextActions: nextActions.slice(0, MAX_SUGGESTIONS) }),
  setEvolvedShortcuts: evolvedShortcuts => set({ evolvedShortcuts: evolvedShortcuts.slice(0, MAX_SUGGESTIONS) }),
  clearLearning: () => set({ suggestions: [], nextActions: [], evolvedShortcuts: [] })
})
