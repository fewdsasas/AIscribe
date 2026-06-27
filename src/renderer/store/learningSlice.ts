import type { StateCreator } from 'zustand'

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

  setSuggestions: suggestions => set({ suggestions }),
  setNextActions: nextActions => set({ nextActions }),
  setEvolvedShortcuts: evolvedShortcuts => set({ evolvedShortcuts }),
  clearLearning: () => set({ suggestions: [], nextActions: [], evolvedShortcuts: [] })
})
