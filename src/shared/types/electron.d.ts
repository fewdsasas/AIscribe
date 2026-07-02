import type {
  Chapter,
  ChapterListPage,
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
  AiRepairData,
  AiRepairResult,
  CreateChapterData,
  CreateCharacterData,
  CreateCheckpointData,
  CreateNovelData,
  CreateProjectData,
  CreateSessionData,
  ExportResult,
  ImportNovelData,
  ImportNovelResult,
  LearningAnalysisResult,
  LLMConfigMeta,
  ProjectSummary,
  RecordLearningData,
  SaveOutlineData,
  SavePlotStructureData,
  SaveWorldData,
  SelectNovelFileResult,
  SkillDetailItem,
  SkillInvokeResult,
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
  novelImport(data: ImportNovelData): Promise<ImportNovelResult>
  selectNovelFile(): Promise<SelectNovelFileResult>

  chapterCreate(data: CreateChapterData): Promise<Chapter>
  chapterList(novelId: string): Promise<ChapterSummary[]>
  chapterListPaginated(novelId: string, offset: number, limit: number): Promise<ChapterListPage>
  chapterCount(novelId: string): Promise<number>
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
  llmTestConnection(config: LLMConfig): Promise<boolean>
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
  secureStorageSet(key: string, value: string): Promise<OperationResult>
  secureStorageGet(key: string): Promise<string | null>
  secureStorageRemove(key: string): Promise<OperationResult>

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

  // AI structure repair
  triggerAiRepair(data: AiRepairData): Promise<AiRepairResult>
  onRepairProgress(callback: (event: { novelId: string; current: number; total: number; action: string }) => void): void
  onRepairDone(callback: (event: { novelId: string; actionsCount: number }) => void): void
  removeRepairListeners(): void
}

declare global {
  interface Window {
    aiscribe?: AiscribeAPI
  }
}

export {}
