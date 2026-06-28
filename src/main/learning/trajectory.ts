import type { CompressionResult, TrajectoryEntry } from '@shared/types'
import type { IDatabase } from '../di/service-interfaces'

export type { TrajectoryEntry, CompressionResult }

export class TrajectoryRecorder {
  private db: IDatabase | null = null

  constructor(db: IDatabase) {
    this.db = db
  }

  async record(data: Omit<TrajectoryEntry, 'id' | 'timestamp'>): Promise<TrajectoryEntry> {
    if (!this.db) throw new Error('TrajectoryRecorder not initialized')
    const entry = this.db.trajectories.record(data)
    this.db.scheduleSave()
    return entry
  }

  getProjectTrajectories(projectId: string, limit = 100): TrajectoryEntry[] {
    if (!this.db) return []
    return this.db.trajectories.getByProject(projectId, limit)
  }

  getSkillTrajectories(skillId: string, limit = 50): TrajectoryEntry[] {
    if (!this.db) return []
    return this.db.trajectories.getBySkill(skillId, limit)
  }

  getSessionTrajectories(sessionId: string): TrajectoryEntry[] {
    if (!this.db) return []
    return this.db.trajectories.getBySession(sessionId)
  }

  compressProject(projectId: string): CompressionResult {
    const entries = this.getProjectTrajectories(projectId, 1000)
    const originalCount = entries.length

    const sessionMap = new Map<string, TrajectoryEntry[]>()
    for (const entry of entries) {
      const list = sessionMap.get(entry.sessionId) ?? []
      list.push(entry)
      sessionMap.set(entry.sessionId, list)
    }

    const summaries: string[] = []
    const compressed: TrajectoryEntry[] = []

    for (const [sessionId, sessionEntries] of sessionMap) {
      const skillCounts = new Map<string, number>()
      for (const e of sessionEntries) {
        skillCounts.set(e.skillId, (skillCounts.get(e.skillId) ?? 0) + 1)
      }

      const topSkills = Array.from(skillCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([skill, count]) => `${skill}(${count}次)`)
        .join(', ')

      const sessionDuration = sessionEntries.reduce((sum, e) => sum + e.duration, 0)
      summaries.push(`会话${sessionId.slice(0, 8)}: 使用${topSkills}, 耗时${Math.round(sessionDuration / 1000)}秒`)

      compressed.push(sessionEntries[0])
      if (sessionEntries.length > 1) {
        compressed.push(sessionEntries[sessionEntries.length - 1])
      }
    }

    return {
      originalCount,
      compressedCount: compressed.length,
      summary: summaries.join('\n'),
      entries: compressed
    }
  }

  countByProject(projectId: string): number {
    if (!this.db) return 0
    return this.db.trajectories.countByProject(projectId)
  }

  getLastActiveByProject(projectId: string): string | null {
    if (!this.db) return null
    return this.db.trajectories.getLastActiveByProject(projectId)
  }

  detectPatterns(projectId: string): { skillId: string; count: number; ratio: number }[] {
    if (!this.db) return []
    return this.db.trajectories.detectPatterns(projectId)
  }

  searchMemory(projectId: string, query: string, limit = 20): TrajectoryEntry[] {
    if (!this.db) return []
    return this.db.trajectories.searchMemory(projectId, query, limit)
  }

  close(): void {
    if (this.db) {
      this.db = null
    }
  }
}
