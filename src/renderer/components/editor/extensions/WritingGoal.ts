import { Extension } from '@tiptap/core'

export interface WritingGoalOptions {
  dailyGoal: number
  sessionStartTime: number | null
  onUpdate?: (stats: WritingGoalStats) => void
}

export interface WritingGoalStats {
  charCount: number
  sessionCharCount: number
  writingSpeed: number
  goalProgress: number
  dailyGoal: number
}

// Pure utility functions (testable without DOM)
export function countChineseChars(text: string): number {
  const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3000-\u303f\uff00-\uffef]/g
  const matches = text.match(chineseRegex)
  return matches ? matches.length : 0
}

export function calculateSpeed(charCount: number, timeMs: number): number {
  if (timeMs <= 0) return 0
  return Math.round((charCount / timeMs) * 60000)
}

export function calculateProgress(current: number, goal: number): number {
  if (goal <= 0) return 0
  return Math.min(Math.round((current / goal) * 100), 100)
}

export function formatProgress(current: number, goal: number): string {
  return `${current} / ${goal} 字 (${calculateProgress(current, goal)}%)`
}

export const WritingGoalPlugin = Extension.create<WritingGoalOptions>({
  name: 'writingGoal',

  addOptions() {
    return {
      dailyGoal: 2000,
      sessionStartTime: null,
      onUpdate: undefined
    }
  },

  addStorage() {
    return {
      charCount: 0,
      sessionCharCount: 0,
      writingSpeed: 0,
      goalProgress: 0,
      dailyGoal: 2000,
      sessionStartTime: Date.now(),
      _debounceTimer: null as ReturnType<typeof setTimeout> | null
    }
  },

  onBeforeCreate() {
    this.storage.dailyGoal = this.options.dailyGoal
    this.storage.sessionStartTime = Date.now()
  },

  onUpdate() {
    if (this.storage._debounceTimer) return
    this.storage._debounceTimer = setTimeout(() => {
      this.storage._debounceTimer = null
    }, 300)

    const editor = this.editor
    const text = editor.state.doc.textContent
    const charCount = countChineseChars(text)

    this.storage.charCount = charCount

    const sessionStart = this.storage.sessionStartTime ?? Date.now()
    const elapsed = Date.now() - sessionStart
    this.storage.sessionCharCount = charCount
    this.storage.writingSpeed = calculateSpeed(charCount, elapsed)
    this.storage.goalProgress = calculateProgress(charCount, this.storage.dailyGoal)

    if (this.options.onUpdate) {
      this.options.onUpdate({
        charCount: this.storage.charCount,
        sessionCharCount: this.storage.sessionCharCount,
        writingSpeed: this.storage.writingSpeed,
        goalProgress: this.storage.goalProgress,
        dailyGoal: this.storage.dailyGoal
      })
    }
  },

  onDestroy() {
    if (this.storage._debounceTimer) {
      clearTimeout(this.storage._debounceTimer)
      this.storage._debounceTimer = null
    }
  }
})
