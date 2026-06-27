import type { DetectedPattern } from './pattern-detector'

export interface EvolvedShortcut {
  name: string
  description: string
  baseSkill: string
  trigger: string
  confidence: number
  frequency: number
  parameters?: Record<string, unknown>
}

export class SkillEvolver {
  private readonly MIN_FREQUENCY = 3
  private readonly MIN_CONFIDENCE = 0.5

  evolve(patterns: DetectedPattern[]): EvolvedShortcut[] {
    const shortcuts: EvolvedShortcut[] = []

    // Group patterns by base skill
    const skillGroups = new Map<string, DetectedPattern[]>()
    for (const pattern of patterns) {
      if (pattern.frequency < this.MIN_FREQUENCY || pattern.confidence < this.MIN_CONFIDENCE) {
        continue
      }
      const list = skillGroups.get(pattern.skillId) ?? []
      list.push(pattern)
      skillGroups.set(pattern.skillId, list)
    }

    for (const [skillId, skillPatterns] of skillGroups) {
      const avgConfidence = skillPatterns.reduce((s, p) => s + p.confidence, 0) / skillPatterns.length
      const totalFrequency = skillPatterns.reduce((s, p) => s + p.frequency, 0)

      // Generate shortcut name
      const name = this.generateShortcutName(skillId, skillPatterns)
      const trigger = this.mergeTriggers(skillPatterns)

      shortcuts.push({
        name,
        description: `快捷方式：${trigger}（基于${totalFrequency}次使用模式自动生成）`,
        baseSkill: skillId,
        trigger,
        confidence: avgConfidence,
        frequency: totalFrequency,
        parameters: {
          autoMode: true,
          preferredStyle: this.inferPreferredStyle(skillPatterns)
        }
      })
    }

    return shortcuts
  }

  private generateShortcutName(skillId: string, patterns: DetectedPattern[]): string {
    const nameMap: Record<string, string> = {
      'character-creation': '角色速创',
      'story-structure': '快速搭结构',
      'world-building': '世界观生成',
      'novel-workflow': '创作流程',
      'revision-polish': '一键润色',
      'anti-ai-rewrite': '去AI味',
      'market-radar': '市场速览',
      'book-analyzer': '快速拆文',
      'novel-master': '创作导航'
    }

    const base = nameMap[skillId] ?? skillId
    const freq = patterns.reduce((s, p) => s + p.frequency, 0)

    if (freq > 10) return `${base}·进阶版`
    if (freq > 5) return `${base}·快捷版`
    return base
  }

  private mergeTriggers(patterns: DetectedPattern[]): string {
    const triggers = patterns.map(p => p.trigger).filter(Boolean)
    if (triggers.length === 0) return '自动模式'
    if (triggers.length === 1) return triggers[0]
    return `${triggers[0]} 等 ${triggers.length} 种场景`
  }

  private inferPreferredStyle(patterns: DetectedPattern[]): string {
    // Simple heuristic: if patterns have high frequency, user prefers efficiency
    const avgFreq = patterns.reduce((s, p) => s + p.frequency, 0) / patterns.length
    if (avgFreq > 7) return '高效模式'
    if (avgFreq > 4) return '标准模式'
    return '精细模式'
  }
}
