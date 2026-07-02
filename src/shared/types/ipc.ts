import type { ChapterStatus, CharacterRole, NarrativeFramework, ProjectStatus, SkillCategory, WorldType } from './index'

// Re-export types used in DTOs
import type { Chapter, Project } from './index'
export type { Project, Chapter }

export type CreateProjectData = {
  name: string
  description?: string
  genre?: string
  status?: ProjectStatus
  targetWordCount?: number
}

export type UpdateProjectData = Partial<
  Pick<Project, 'name' | 'description' | 'genre' | 'status' | 'cover' | 'targetWordCount'>
> & { id?: never }

export type CreateNovelData = {
  projectId: string
  title: string
  author?: string
  synopsis?: string
  genre?: string
  tags?: string[]
  targetAudience?: string
}

export type CreateChapterData = {
  novelId: string
  title: string
  content?: string
  sortOrder?: number
  status?: ChapterStatus
  notes?: string
}

export type UpdateChapterData = Partial<Pick<Chapter, 'title' | 'content' | 'sortOrder' | 'status' | 'notes'>> & {
  id?: never
}

export type CreateCharacterData = {
  novelId: string
  name: string
  role: CharacterRole
  personality?: {
    traits: string[]
    virtues: string[]
    flaws: string[]
    motivations: string[]
    coreBelief: string
    mbti?: string
    enneagram?: string
    innerConflict?: string
  }
  background?: string
  appearance?: string
  aliases?: string[]
  abilities?: string[]
  goals?: string[]
  fears?: string[]
  secrets?: string[]
  arc?: {
    type: 'positive' | 'negative' | 'static'
    startingState: string
    endingState: string
    catalyst: string
    keyMoments: string[]
  }
  relationships?: { targetId: string; type: string; description: string; intensity: number }[]
}

export type SavePlotStructureData = {
  novelId: string
  framework: NarrativeFramework
  beats: {
    id: string
    name: string
    description: string
    sortOrder: number
    chapterIds: string[]
    emotionalIntensity: number
    status: 'planned' | 'drafted' | 'revised'
  }[]
  notes?: string
}

export type SaveWorldData = {
  novelId: string
  name: string
  type: WorldType
  geography?: {
    description: string
    climate: string
    keyLocations: { id: string; name: string; type: string; description: string; significance: string }[]
  }
  history?: { era: string; events: string[]; significance: string }[]
  society?: { government: string; socialClasses: string[]; laws: string[]; culture: string; dailyLife: string }
  powerSystem?: { name: string; rules: string[]; limitations: string[]; costs: string[]; source: string }
  technology?: 'primitive' | 'medieval' | 'renaissance' | 'industrial' | 'modern' | 'futuristic' | 'mixed'
  economy?: { currency: string; resources: string[]; trade: string; occupations: string[] }
}

export type SaveOutlineData = {
  novelId: string
  type: 'brief' | 'detailed'
  content?: string
  structure?: {
    id: string
    title: string
    content: string
    sortOrder: number
    wordCount: number
    phase: 'beginning' | 'middle' | 'ending'
    keyPoints: string[]
  }[]
}

export type CreateCheckpointData = {
  projectId: string
  label: string
  description?: string
  snapshot?: { novel: string; characters: string; worlds: string; plots: string; outline: string }
  tags?: string[]
}

export type CreateSessionData = {
  projectId: string
} & Record<string, unknown>

export type RecordLearningData = {
  projectId: string
  sessionId: string
  skillId?: string
  query: string
  response: string
  duration: number
  context?: Record<string, unknown>
}

export type LLMConfigMeta = {
  provider: string
  model: string
  baseUrl?: string
  hasKey: boolean
  customProtocol?: 'openai' | 'anthropic'
} | null

export type LearningAnalysisResult = {
  patterns: unknown[]
  suggestions: string[]
  nextActions: unknown[]
  shortcuts: unknown[]
}

export type ProjectSummary = {
  totalInteractions: number
  topSkills: string[]
  lastActive: string
}

export type SkillInvokeResult = {
  skillName: string
  output: string
  metadata?: Record<string, unknown>
}

export type SkillListItem = { name: string; description: string }
export type SkillDetailItem = { name: string; description: string; category: SkillCategory }

export type ExportResult = { content: string; filename: string }

export type ChunkedExportResult =
  | { content: string; filename: string; chunked: false }
  | { chunkId: string; totalChunks: number; filename: string; chunked: true }

export type ExportChunk = { index: number; data: string }

export type ImportNovelData = {
  filePath: string
  projectId?: string
  format?: 'txt' | 'epub' | 'docx' | 'pdf'
}

export type ImportNovelResult = {
  projectId: string
  novelId: string
  title: string
  author: string
  chapterCount: number
  totalWordCount: number
}

export type SelectNovelFileResult = {
  canceled: boolean
  filePath: string | null
}

// ===== AI Structure Repair Types =====

export type RepairActionType =
  | 'chapter_split'
  | 'chapter_merge'
  | 'paragraph_rejoin'
  | 'impurity_removed'
  | 'title_normalized'
  | 'no_change'

export interface RepairAction {
  type: RepairActionType
  description: string
  /** 针对的章节索引（split/merge/paragraph_rejoin/impurity_removed 时使用） */
  chapterIndex?: number
  /** 合并时的多个章节索引 */
  chapterIndices?: number[]
  /** 旧标题（normalize 时使用） */
  oldTitle?: string
  /** 新标题（normalize 时使用） */
  newTitle?: string
}

export interface AiRepairData {
  novelId: string
  projectId: string
}

export interface AiRepairResult {
  applied: boolean
  actionsCount: number
  actions: RepairAction[]
}

export interface AiRepairProgressEvent {
  novelId: string
  current: number
  total: number
  action: string
}

export interface AiRepairDoneEvent {
  novelId: string
  actionsCount: number
}

export type AiRepairConfidenceLevel = 'high' | 'low' | 'none'

// ===== Common Operation Result Types =====

/** 更新/删除操作的统一返回结构 */
export interface OperationResult {
  success: boolean
  /** 受影响的记录数（可选） */
  affected?: number
}

/** 取消操作的统一返回结构 */
export interface CancelResult {
  cancelled: boolean
}

// ===== Structured Query Parameter Types =====

/** 按ID查询的统一参数结构 */
export interface GetByIdData {
  id: string
}

/** 按项目ID查询的统一参数结构 */
export interface GetByProjectIdData {
  projectId: string
}

/** 按小说ID查询的统一参数结构 */
export interface GetByNovelIdData {
  novelId: string
}

/** 章节列表分页查询的参数结构 */
export interface ListChaptersPaginatedData {
  novelId: string
  offset: number
  limit: number
}

/** 更新操作的统一参数结构（泛型） */
export interface UpdateByIdData<T> {
  id: string
  updates: T
}

/** 删除操作的统一参数结构 */
export interface DeleteByIdData {
  id: string
}

/** 学习分析的参数结构 */
export interface LearningAnalyzeData {
  projectId: string
}

/** 学习总结的参数结构 */
export interface LearningSummaryData {
  projectId: string
}

/** 记忆搜索的参数结构 */
export interface MemorySearchData {
  projectId: string
  query: string
}

/** 技能查询的参数结构 */
export interface SkillGetData {
  name: string
}

/** 技能调用的参数结构 */
export interface SkillInvokeData {
  name: string
  prompt: string
}

/** 导出项目的参数结构 */
export interface ExportProjectData {
  projectId: string
  format: string
  includeSynopsis?: boolean
}

/** 导出分块的参数结构 */
export interface ExportChunkData {
  chunkId: string
  index: number
}

/** 检查点列表查询的参数结构 */
export interface CheckpointListData {
  projectId: string
}

/** 会话列表查询的参数结构 */
export interface SessionListData {
  projectId: string
}

/** 检查点恢复的参数结构 */
export interface CheckpointRestoreData {
  id: string
}

/** 世界设定查询的参数结构 */
export interface WorldGetData {
  novelId: string
}

/** 大纲查询的参数结构 */
export interface OutlineGetData {
  novelId: string
}

/** 情节结构查询的参数结构 */
export interface PlotStructureGetData {
  novelId: string
}

/** 章节字数统计的参数结构 */
export interface ChapterCountsData {
  novelIds: string[]
}

/** 加密存储设置的参数结构 */
export interface EncryptSetData {
  key: string
  value: string
}

/** 加密存储获取的参数结构 */
export interface EncryptGetData {
  key: string
}

/** 加密存储删除的参数结构 */
export interface EncryptRemoveData {
  key: string
}

/** LLM 配置测试连接结果 */
export interface LLMTestConnectionResult {
  success: boolean
  connected: boolean
}

/** 作者模型查询参数 */
export interface WriterModelGetData {
  writerId: string
}

/** 取消流式请求参数 */
export interface CancelStreamData {
  requestId: string
}

// ===== IPC Error Types =====

/** IPC 错误码常量 */
export type IPCErrorCode =
  | 'INVALID_ID'
  | 'INVALID_DATA'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'DB_ERROR'
  | 'LLM_ERROR'
  | 'PERMISSION_DENIED'
  | 'INTERNAL_ERROR'

/** 结构化 IPC 错误 */
export interface IPCError extends Error {
  /** 错误码，用于区分错误类型 */
  code: IPCErrorCode
  /** 原始错误消息（已清洗敏感信息） */
  message: string
  /** 额外上下文信息 */
  details?: Record<string, unknown>
}

/** 创建 IPC 错误的工厂函数类型 */
export type CreateIPCError = (code: IPCErrorCode, message: string, details?: Record<string, unknown>) => IPCError
