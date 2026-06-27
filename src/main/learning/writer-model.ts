import type { NextAction, TrajectoryEntry, WriterProfile } from '@shared/types'
export type { WriterProfile, NextAction }

export class WriterModelUpdater {
  buildModel(entries: TrajectoryEntry[]): WriterProfile {
    const writerId = entries.length > 0 ? entries[0].projectId : 'unknown'

    // Count skill usage
    const skillCounts = new Map<string, { count: number; lastUsed: string }>()
    for (const entry of entries) {
      const existing = skillCounts.get(entry.skillId)
      if (existing) {
        existing.count++
        if (entry.timestamp > existing.lastUsed) {
          existing.lastUsed = entry.timestamp
        }
      } else {
        skillCounts.set(entry.skillId, { count: 1, lastUsed: entry.timestamp })
      }
    }

    const frequentSkills = Array.from(skillCounts.entries())
      .map(([skillId, data]) => ({ skillId, ...data }))
      .sort((a, b) => b.count - a.count)

    // Calculate averages
    const totalDuration = entries.reduce((sum, e) => sum + e.duration, 0)
    const totalQueryLength = entries.reduce((sum, e) => sum + e.query.length, 0)

    return {
      writerId,
      frequentSkills,
      stylePreferences: {
        preferredSkills: frequentSkills.slice(0, 3).map(s => s.skillId),
        averageSessionDuration: entries.length > 0 ? totalDuration / entries.length : 0,
        typicalQueryLength: entries.length > 0 ? Math.round(totalQueryLength / entries.length) : 0
      },
      timeDistribution: {
        totalSessions: entries.length,
        totalDuration,
        averagePerSession: entries.length > 0 ? totalDuration / entries.length : 0,
        skillsUsed: Array.from(skillCounts.keys())
      },
      lastUpdated: new Date().toISOString()
    }
  }

  suggestNextActions(model: WriterProfile): NextAction[] {
    const suggestions: NextAction[] = []
    const topSkills = model.frequentSkills.map(s => s.skillId)

    // Common writing workflows
    const workflowMap: Record<string, string[]> = {
      'character-creation': ['world-building', 'story-structure'],
      'story-structure': ['character-creation', 'novel-workflow'],
      'world-building': ['story-structure', 'character-creation'],
      'novel-workflow': ['story-structure', 'character-creation'],
      'revision-polish': ['anti-ai-rewrite'],
      'book-analyzer': ['market-radar']
    }

    // If we have recently used skills, suggest what typically comes next
    if (topSkills.length > 0) {
      const lastSkill = topSkills[0]
      const nextSteps = workflowMap[lastSkill]

      if (nextSteps) {
        for (const nextSkill of nextSteps) {
          if (!topSkills.includes(nextSkill)) {
            suggestions.push({
              suggestedSkill: nextSkill,
              reason: `使用「${lastSkill}」后，通常需要「${nextSkill}」来完善创作`,
              confidence: 0.7
            })
          }
        }
      }
    }

    // Suggest skills the user hasn't used much
    const allSkills = [
      'story-structure',
      'character-creation',
      'world-building',
      'novel-workflow',
      'market-radar',
      'book-analyzer',
      'anti-ai-rewrite',
      'revision-polish',
      'novel-master'
    ]

    for (const skill of allSkills) {
      if (!topSkills.includes(skill)) {
        suggestions.push({
          suggestedSkill: skill,
          reason: `你还未尝试过「${skill}」技能，它可能对你有帮助`,
          confidence: 0.4
        })
      }
    }

    return suggestions.slice(0, 3)
  }
}
