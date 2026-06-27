import { TrajectoryRecorder } from './trajectory'
import { type DetectedPattern, PatternDetector } from './pattern-detector'
import { type NextAction, WriterModelUpdater, type WriterProfile } from './writer-model'
import { type EvolvedShortcut, SkillEvolver } from './skill-evolver'
import type { IDatabase } from '../di/service-interfaces'

export interface LearningAnalysis {
  patterns: DetectedPattern[]
  suggestions: string[]
  profile: WriterProfile
  nextActions: NextAction[]
  shortcuts: EvolvedShortcut[]
}

export class LearningEngine {
  private recorder: TrajectoryRecorder
  private detector = new PatternDetector()
  private writerUpdater = new WriterModelUpdater()
  private evolver = new SkillEvolver()
  private saveProfileCallback: ((profile: WriterProfile) => void) | null = null

  constructor(db: IDatabase) {
    this.recorder = new TrajectoryRecorder(db)
  }

  setSaveProfileCallback(cb: (profile: WriterProfile) => void): void {
    this.saveProfileCallback = cb
  }

  static create(db: IDatabase): LearningEngine {
    return new LearningEngine(db)
  }

  getRecorder(): TrajectoryRecorder {
    return this.recorder
  }

  async recordInteraction(data: {
    projectId: string
    sessionId: string
    skillId?: string
    query: string
    response: string
    duration: number
    context?: Record<string, unknown>
  }): Promise<void> {
    await this.recorder.record({
      projectId: data.projectId,
      sessionId: data.sessionId,
      skillId: data.skillId ?? 'general-chat',
      query: data.query,
      response: data.response,
      duration: data.duration,
      context: data.context ?? {}
    })
  }

  async analyzeProject(projectId: string): Promise<LearningAnalysis> {
    const entries = this.recorder.getProjectTrajectories(projectId, 200)

    const patterns = this.detector.analyze(entries)
    const suggestions = this.detector.generateSuggestions(patterns)
    const profile = this.writerUpdater.buildModel(entries)
    if (this.saveProfileCallback) {
      await this.saveProfileCallback(profile)
    }
    const nextActions = this.writerUpdater.suggestNextActions(profile)
    const shortcuts = this.evolver.evolve(patterns)

    return { patterns, suggestions, profile, nextActions, shortcuts }
  }

  getProjectSummary(projectId: string): {
    totalInteractions: number
    topSkills: string[]
    lastActive: string
  } {
    // Memory optimization: previously fetched up to 10000 trajectory rows
    // just to surface a count and a sample timestamp. Each row can carry a
    // large `response` payload, so we now bound the page to 500 rows. For
    // projects with extensive history, `totalInteractions` becomes a lower
    // bound (capped at 500); `topSkills` is unaffected because it is derived
    // from `detectPatterns` (its own aggregation query).
    const entries = this.recorder.getProjectTrajectories(projectId, 500)
    const patterns = this.recorder.detectPatterns(projectId)

    return {
      totalInteractions: entries.length,
      topSkills: patterns.slice(0, 3).map(p => p.skillId),
      lastActive: entries[0]?.timestamp ?? '从未使用'
    }
  }

  close(): void {
    this.recorder.close()
  }
}
