import type {
  Chapter,
  ChapterSummary,
  Character,
  Checkpoint,
  LLMConfig,
  LLMRequest,
  LLMResponse,
  Novel,
  Outline,
  PlotStructure,
  Project,
  SessionMemory,
  World
} from './index'
import type {
  CreateChapterData,
  CreateCharacterData,
  CreateCheckpointData,
  CreateNovelData,
  CreateProjectData,
  CreateSessionData,
  ExportResult,
  LearningAnalysisResult,
  LLMConfigMeta,
  ProjectSummary,
  RecordLearningData,
  SaveOutlineData,
  SavePlotStructureData,
  SaveWorldData,
  SkillDetailItem,
  SkillInvokeResult,
  SkillListItem,
  UpdateChapterData,
  UpdateProjectData
} from './ipc'

export interface AiscribeAPI {
  projectCreate(data: CreateProjectData): Promise<Project>
  projectList(): Promise<Project[]>
  projectDashboardStats(): Promise<Array<Project & { novelCount: number; chapterCount: number }>>
  projectGet(id: string): Promise<Project | null>
  projectUpdate(id: string, data: UpdateProjectData): Promise<boolean>
  projectDelete(id: string): Promise<boolean>

  novelCreate(data: CreateNovelData): Promise<Novel>
  novelGet(id: string): Promise<Novel | null>
  novelGetByProject(projectId: string): Promise<Novel | null>

  chapterCreate(data: CreateChapterData): Promise<Chapter>
  chapterList(novelId: string): Promise<ChapterSummary[]>
  chapterListWithContent(novelId: string): Promise<Chapter[]>
  chapterGet(id: string): Promise<Chapter | null>
  chapterUpdate(id: string, data: UpdateChapterData): Promise<boolean>
  chapterCounts(novelIds: string[]): Promise<Record<string, number>>

  characterCreate(data: CreateCharacterData): Promise<Character>
  characterList(novelId: string): Promise<Character[]>

  plotStructureGetByNovel(novelId: string): Promise<PlotStructure | null>
  plotStructureSave(data: SavePlotStructureData): Promise<PlotStructure>

  worldGetByNovel(novelId: string): Promise<World | null>
  worldSave(data: SaveWorldData): Promise<World>

  outlineGet(novelId: string): Promise<Outline | null>
  outlineSave(data: SaveOutlineData): Promise<Outline>

  checkpointCreate(data: CreateCheckpointData): Promise<Checkpoint>
  checkpointList(projectId: string): Promise<Checkpoint[]>
  checkpointRestore(id: string): Promise<boolean>

  sessionCreate(data: CreateSessionData): Promise<SessionMemory>
  sessionList(projectId: string): Promise<SessionMemory[]>

  writerModelGet(writerId: string): Promise<unknown>
  writerModelSave(profile: unknown): Promise<boolean>

  skillList(): Promise<SkillListItem[]>
  skillGet(name: string): Promise<SkillDetailItem | null>
  skillInvoke(name: string, input: { prompt: string }): Promise<SkillInvokeResult>

  learningRecord(data: RecordLearningData): Promise<boolean>
  learningAnalyze(projectId: string): Promise<LearningAnalysisResult>
  learningSummary(projectId: string): Promise<ProjectSummary>
  memorySearch(projectId: string, query: string): Promise<unknown[]>

  llmChat(request: LLMRequest): Promise<LLMResponse>
  llmConfig(config: LLMConfig): Promise<boolean>
  llmIsConfigured(): Promise<boolean>
  llmConfigMeta(): Promise<LLMConfigMeta>
  startLLMStream(request: LLMRequest): Promise<boolean>
  cancelLLMStream(requestId: string): Promise<boolean>
  onLLMChunk(callback: (chunk: string) => void): void
  onLLMDone(
    callback: (data: { usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }) => void
  ): void
  onLLMError(callback: (error: string) => void): void
  removeLLMListeners(): void

  dbTables(): Promise<string[]>

  exportProject(options: { projectId: string; format: string; includeSynopsis?: boolean }): Promise<ExportResult>

  // Secure encrypted storage
  secureStorageSet(key: string, value: string): Promise<boolean>
  secureStorageGet(key: string): Promise<string | null>
  secureStorageRemove(key: string): Promise<boolean>

  // Memory monitoring
  getMemoryUsage(): Promise<{
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
    arrayBuffers: number
    dbSize: number
    timestamp: number
  }>
}

declare global {
  interface Window {
    aiscribe?: AiscribeAPI
  }
}

export {}
