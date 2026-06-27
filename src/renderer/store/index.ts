import { create } from 'zustand'
import { type ChatSlice, createChatSlice } from './chatSlice'
import { createLearningSlice, type LearningSlice } from './learningSlice'

export type { ChatMessage, SkillInvocation } from './chatSlice'
export type { NextActionSuggestion } from './learningSlice'

export interface AppStore extends ChatSlice, LearningSlice {}

export const useAppStore = create<AppStore>()((...args) => ({
  ...createChatSlice(...args),
  ...createLearningSlice(...args)
}))
