// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import {
  calculateProgress,
  calculateSpeed,
  countChineseChars,
  formatProgress,
  WritingGoalPlugin
} from '../../../src/renderer/components/editor/extensions/WritingGoal'

describe('WritingGoalPlugin', () => {
  describe('Chinese character counting', () => {
    it('should count Chinese characters correctly', () => {
      const count = countChineseChars('这是一个测试句子')
      expect(count).toBe(8)
    })

    it('should count mixed Chinese and English correctly', () => {
      const count = countChineseChars('Hello 世界 this is 测试')
      expect(count).toBe(4)
    })

    it('should count punctuation as characters', () => {
      const count = countChineseChars('你好，世界！')
      expect(count).toBe(6)
    })

    it('should return 0 for empty text', () => {
      const count = countChineseChars('')
      expect(count).toBe(0)
    })

    it('should handle only English/numbers', () => {
      const count = countChineseChars('Hello World 123')
      expect(count).toBe(0)
    })
  })

  describe('Writing speed calculation', () => {
    it('should calculate chars per minute', () => {
      const speed = calculateSpeed(500, 60000)
      expect(speed).toBe(500)
    })

    it('should handle short durations', () => {
      const speed = calculateSpeed(50, 6000)
      expect(speed).toBe(500)
    })

    it('should return 0 for zero duration', () => {
      const speed = calculateSpeed(100, 0)
      expect(speed).toBe(0)
    })
  })

  describe('Plugin storage', () => {
    it('should have correct name', () => {
      const ext = WritingGoalPlugin.configure({ dailyGoal: 2000 })
      expect(ext.name).toBe('writingGoal')
    })

    it('should expose default storage values', () => {
      const ext = WritingGoalPlugin.configure({ dailyGoal: 2000 })
      const storage = ext.storage
      expect(storage.charCount).toBe(0)
      expect(storage.sessionCharCount).toBe(0)
      expect(storage.writingSpeed).toBe(0)
      expect(storage.goalProgress).toBe(0)
      expect(storage.dailyGoal).toBe(2000)
    })
  })

  describe('Goal progress', () => {
    it('should calculate progress percentage', () => {
      const progress = calculateProgress(500, 2000)
      expect(progress).toBe(25)
    })

    it('should cap at 100 percent', () => {
      const progress = calculateProgress(3000, 2000)
      expect(progress).toBe(100)
    })

    it('should return 0 for zero goal', () => {
      const progress = calculateProgress(500, 0)
      expect(progress).toBe(0)
    })

    it('should format progress as display string', () => {
      const display = formatProgress(500, 2000)
      expect(display).toContain('500')
      expect(display).toContain('2000')
    })
  })
})
