import type {
  Chapter,
  ChapterSummary,
  Character,
  Checkpoint,
  CheckpointSnapshot,
  LLMConfig,
  LLMProvider as LLMProviderType,
  LLMRequest,
  LLMResponse,
  NextAction,
  Novel,
  Outline,
  PlotStructure,
  Project,
  SessionMemory,
  TrajectoryEntry,
  World,
  WriterProfile
} from '../../shared/types'
import type { RecordLearningData } from '../../shared/types/ipc'

/**
 * Data-layer abstraction exposed to the IPC layer.
 *
 * The interface is intentionally a subset of Database's public surface:
 * it contains only the operations that IPC handlers need, so the data layer
 * can evolve without leaking implementation details (sql.js, OperationLog,
 * internal repositories) to the rest of the application.
 */
export interface IDatabase {
  // Lifecycle
  save(): void
  scheduleSave(): void
  close(): void

  // Introspection
  getTableNames(): string[]

  // Project
  createProject(data: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>> & { id?: string }): Project
  getProject(id: string): Project | null
  listProjects(): Project[]
  listProjectsWithStats(): Array<Project & { novelCount: number; chapterCount: number }>
  updateProject(id: string, data: Partial<Omit<Project, 'id' | 'createdAt'>>): void
  deleteProject(id: string): void
  createProjectsBatch(projects: Omit<Project, 'createdAt' | 'updatedAt'>[]): Project[]

  // Novel
  createNovel(data: Partial<Omit<Novel, 'id' | 'createdAt' | 'updatedAt'>> & { id?: string }): Novel
  getNovel(id: string): Novel | null
  getNovelByProject(projectId: string): Novel | null

  // Chapter
  createChapter(data: Partial<Omit<Chapter, 'id' | 'createdAt' | 'updatedAt'>> & { id?: string }): Chapter
  listChapters(novelId: string): ChapterSummary[]
  listChaptersWithContent(novelId: string): Chapter[]
  getChapter(id: string): Chapter | null
  updateChapter(id: string, data: Partial<Omit<Chapter, 'id' | 'createdAt' | 'novelId'>>): void
  getChapterCounts(novelIds: string[]): Record<string, number>
  createChaptersBatch(chapters: Omit<Chapter, 'createdAt' | 'updatedAt'>[]): Chapter[]

  // Character
  createCharacter(data: Partial<Omit<Character, 'id' | 'createdAt' | 'updatedAt'>> & { id?: string }): Character
  listCharacters(novelId: string): Character[]

  // World
  getWorldByNovel(novelId: string): World | null
  saveWorld(data: Partial<Omit<World, 'id' | 'createdAt' | 'updatedAt'>> & { id?: string }): World

  // Plot structure
  getPlotStructureByNovel(novelId: string): PlotStructure | null
  savePlotStructure(data: Partial<Omit<PlotStructure, 'id'>> & { id?: string }): PlotStructure

  // Outline
  getOutline(novelId: string): Outline | null
  saveOutline(data: Partial<Omit<Outline, 'id' | 'createdAt' | 'updatedAt'>> & { id?: string }): Outline

  // Checkpoint
  createCheckpoint(data: Partial<Omit<Checkpoint, 'id' | 'createdAt'>> & { id?: string }): Checkpoint
  listCheckpoints(projectId: string): Checkpoint[]
  getCheckpointSnapshot(id: string): CheckpointSnapshot | null

  // Session memory
  createSessionMemory(
    data: Partial<Omit<SessionMemory, 'id' | 'createdAt' | 'updatedAt'>> & { id?: string }
  ): SessionMemory
  listSessionMemories(projectId: string): SessionMemory[]

  // Writer model
  getWriterModel(writerId: string): WriterProfile | null
  saveWriterModel(profile: WriterProfile): void

  // Learning
  trajectories: {
    record(data: Omit<TrajectoryEntry, 'id' | 'timestamp'>): TrajectoryEntry
    getByProject(projectId: string, limit?: number): TrajectoryEntry[]
    getBySkill(skillId: string, limit?: number): TrajectoryEntry[]
    getBySession(sessionId: string): TrajectoryEntry[]
    detectPatterns(projectId: string): { skillId: string; count: number; ratio: number }[]
    searchMemory(projectId: string, query: string, limit?: number): TrajectoryEntry[]
  }
}

export interface ILLMProvider {
  configure(config: LLMConfig): void
  resetConfig(): void
  chat(request: LLMRequest, provider?: LLMProviderType): Promise<LLMResponse>
  chatStream(
    request: LLMRequest,
    callbacks: {
      onChunk: (text: string) => void
      onDone: (usage?: { promptTokens: number; completionTokens: number; totalTokens: number }) => void
      onError: (error: string) => void
    },
    provider?: LLMProviderType,
    requestId?: string
  ): Promise<void>
  cancelStream(requestId: string): boolean
}

export interface SkillDefinitionLite {
  name: string
  description: string
  category: string
}

export interface SkillInput {
  prompt: string
  context?: Record<string, unknown>
  parameters?: Record<string, unknown>
}

export interface SkillResult {
  skillName: string
  output: string
  metadata?: Record<string, unknown>
}

export interface ISkillLoader {
  getRegistry(): SkillDefinitionLite[]
  getSkill(name: string): SkillDefinitionLite | null
  executeSkill(name: string, input: SkillInput): Promise<SkillResult>
}

export interface ILearningEngine {
  recordInteraction(data: RecordLearningData): Promise<void>
  analyzeProject(projectId: string): Promise<{
    patterns: {
      id: string
      category: string
      skillId: string
      trigger: string
      frequency: number
      confidence: number
      description: string
    }[]
    suggestions: string[]
    profile: WriterProfile
    nextActions: NextAction[]
    shortcuts: {
      name: string
      description: string
      baseSkill: string
      trigger: string
      confidence: number
      frequency: number
      parameters?: Record<string, unknown>
    }[]
  }>
  getProjectSummary(projectId: string): {
    totalInteractions: number
    topSkills: string[]
    lastActive: string
  }
  getRecorder(): {
    searchMemory(projectId: string, query: string, limit?: number): TrajectoryEntry[]
  }
  close(): void
}
