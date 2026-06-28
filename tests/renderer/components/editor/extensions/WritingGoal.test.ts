// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import {
  calculateProgress,
  calculateSpeed,
  countChineseChars,
  formatProgress
} from '@renderer/components/editor/extensions/WritingGoal'

describe('WritingGoal utilities', () => {
  describe('countChineseChars', () => {
    it('should count Chinese characters', () => {
      expect(countChineseChars('你好世界')).toBe(4)
    })

    it('should count punctuation and full-width characters', () => {
      expect(countChineseChars('你好，世界！')).toBe(6)
    })

    it('should return 0 for empty string', () => {
      expect(countChineseChars('')).toBe(0)
    })

    it('should return 0 for non-Chinese string', () => {
      expect(countChineseChars('hello world')).toBe(0)
    })
  })

  describe('calculateSpeed', () => {
    it('should calculate characters per minute', () => {
      expect(calculateSpeed(60, 60000)).toBe(60)
    })

    it('should return 0 when time is 0', () => {
      expect(calculateSpeed(100, 0)).toBe(0)
    })

    it('should return 0 when time is negative', () => {
      expect(calculateSpeed(100, -1)).toBe(0)
    })

    it('should round to nearest integer', () => {
      expect(calculateSpeed(100, 60000)).toBe(100)
    })
  })

  describe('calculateProgress', () => {
    it('should calculate progress percentage', () => {
      expect(calculateProgress(1000, 2000)).toBe(50)
    })

    it('should cap progress at 100', () => {
      expect(calculateProgress(3000, 2000)).toBe(100)
    })

    it('should return 0 when goal is 0', () => {
      expect(calculateProgress(1000, 0)).toBe(0)
    })

    it('should return 0 when goal is negative', () => {
      expect(calculateProgress(1000, -1)).toBe(0)
    })

    it('should return 0 when current is 0', () => {
      expect(calculateProgress(0, 2000)).toBe(0)
    })
  })

  describe('formatProgress', () => {
    it('should format progress string', () => {
      expect(formatProgress(1000, 2000)).toBe('1000 / 2000 字 (50%)')
    })
  })
})
