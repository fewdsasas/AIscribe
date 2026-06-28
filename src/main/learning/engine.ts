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
  private writerUpdater: WriterModelUpdater
  private evolver = new SkillEvolver()
  private saveProfileCallback: ((profile: WriterProfile) => void) | null = null

  constructor(db: IDatabase, writerId: string) {
    this.recorder = new TrajectoryRecorder(db)
    this.writerUpdater = new WriterModelUpdater(writerId)
  }

  setSaveProfileCallback(cb: (profile: WriterProfile) => void): void {
    this.saveProfileCallback = cb
  }

  static create(db: IDatabase, writerId?: string): LearningEngine {
    return new LearningEngine(db, writerId ?? 'unknown')
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
    const totalInteractions = this.recorder.countByProject(projectId)
    const patterns = this.recorder.detectPatterns(projectId)
    const lastActive = this.recorder.getLastActiveByProject(projectId)

    return {
      totalInteractions,
      topSkills: patterns.slice(0, 3).map(p => p.skillId),
      lastActive: lastActive ?? '从未使用'
    }
  }

  close(): void {
    this.recorder.close()
  }
}
