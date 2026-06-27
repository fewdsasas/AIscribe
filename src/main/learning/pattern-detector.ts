import type { TrajectoryEntry } from '@shared/types'
import { logger } from '../utils/logger'

export interface DetectedPattern {
  id: string
  category: 'skill_frequency' | 'sequence' | 'time_cluster' | 'query_similarity'
  skillId: string
  trigger: string
  frequency: number
  confidence: number
  description: string
}

export interface Suggestion {
  type: 'shortcut' | 'reminder' | 'workflow'
  skillId: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
}

export class PatternDetector {
  analyze(entries: TrajectoryEntry[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = []

    if (entries.length < 3) return patterns

    // 1. Detect high-frequency skill usage
    patterns.push(...this.detectSkillFrequency(entries))

    // 2. Detect sequential patterns (A → B → C)
    patterns.push(...this.detectSequences(entries))

    // 3. Detect time-based clustering
    patterns.push(...this.detectTimeClusters(entries))

    return patterns
  }

  private detectSkillFrequency(entries: TrajectoryEntry[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = []
    const skillCounts = new Map<string, number>()

    for (const entry of entries) {
      skillCounts.set(entry.skillId, (skillCounts.get(entry.skillId) ?? 0) + 1)
    }

    const total = entries.length
    for (const [skillId, count] of skillCounts) {
      const ratio = count / total
      if (ratio >= 0.2) {
        patterns.push({
          id: `freq-${skillId}`,
          category: 'skill_frequency',
          skillId,
          trigger: `频繁使用 ${skillId}`,
          frequency: count,
          confidence: Math.min(ratio * 1.5, 1),
          description: `使用了 ${count} 次，占总操作 ${Math.round(ratio * 100)}%`
        })
      }
    }

    return patterns
  }

  private detectSequences(entries: TrajectoryEntry[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = []
    const sequences = new Map<string, number>()

    for (let i = 0; i < entries.length - 1; i++) {
      // Only sequence within same session
      if (entries[i].sessionId === entries[i + 1].sessionId) {
        const seq = `${entries[i].skillId}→${entries[i + 1].skillId}`
        sequences.set(seq, (sequences.get(seq) ?? 0) + 1)
      }
    }

    for (const [seq, count] of sequences) {
      if (count >= 2) {
        const [from, to] = seq.split('→')
        patterns.push({
          id: `seq-${seq.replace('→', '-')}`,
          category: 'sequence',
          skillId: to,
          trigger: seq,
          frequency: count,
          confidence: Math.min(count / 5, 1),
          description: `使用 ${from} 后通常会使用 ${to}（${count} 次）`
        })
      }
    }

    return patterns
  }

  private detectTimeClusters(entries: TrajectoryEntry[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = []

    // Group entries by hour
    const hourCounts = new Map<number, number>()
    for (const entry of entries) {
      try {
        const hour = new Date(entry.timestamp).getHours()
        hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1)
      } catch {
        logger.warn('pattern-detector: invalid timestamp, skipping entry')
      }
    }

    if (hourCounts.size > 0) {
      const maxHour = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0]
      const total = entries.length
      const hourRatio = maxHour[1] / total

      if (hourRatio > 0.3) {
        patterns.push({
          id: `time-${maxHour[0]}`,
          category: 'time_cluster',
          skillId: 'all',
          trigger: `${maxHour[0]} 点创作高峰`,
          frequency: maxHour[1],
          confidence: Math.min(hourRatio * 1.2, 1),
          description: `你倾向于在 ${maxHour[0]}:00 左右写作（占总量 ${Math.round(hourRatio * 100)}%）`
        })
      }
    }

    return patterns
  }

  generateSuggestions(patterns: DetectedPattern[]): string[] {
    const suggestions: string[] = []

    for (const pattern of patterns) {
      if (pattern.category === 'skill_frequency' && pattern.confidence > 0.7) {
        suggestions.push(`🔁 你经常使用「${pattern.skillId}」技能，可以创建一个快捷方式提高效率`)
      }
      if (pattern.category === 'sequence' && pattern.confidence > 0.6) {
        const [from, to] = pattern.trigger.split('→')
        suggestions.push(`🔄 检测到常用流程：「${from}」→「${to}」，可设置自动化工作流`)
      }
      if (pattern.category === 'time_cluster') {
        suggestions.push(`⏰ 你的创作高峰在触发时段，建议在这些时间安排写作`)
      }
    }

    if (suggestions.length === 0) {
      suggestions.push('📊 数据尚不足，继续使用后将提供个性化建议')
    }

    return suggestions
  }
}
