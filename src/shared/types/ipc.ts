export const IPC_CHANNELS = {
  PROJECT_CREATE: 'project:create',
  PROJECT_LIST: 'project:list',
  PROJECT_DASHBOARD_STATS: 'project:dashboard-stats',
  PROJECT_GET: 'project:get',
  PROJECT_UPDATE: 'project:update',
  PROJECT_DELETE: 'project:delete',

  NOVEL_CREATE: 'novel:create',
  NOVEL_GET: 'novel:get',
  NOVEL_GET_BY_PROJECT: 'novel:get-by-project',

  CHAPTER_CREATE: 'chapter:create',
  CHAPTER_LIST: 'chapter:list',
  CHAPTER_LIST_WITH_CONTENT: 'chapter:list-with-content',
  CHAPTER_GET: 'chapter:get',
  CHAPTER_UPDATE: 'chapter:update',
  CHAPTER_COUNTS: 'chapter:counts',

  CHARACTER_CREATE: 'character:create',
  CHARACTER_LIST: 'character:list',

  PLOT_STRUCTURE_GET_BY_NOVEL: 'plot-structure:get-by-novel',
  PLOT_STRUCTURE_SAVE: 'plot-structure:save',

  WORLD_GET_BY_NOVEL: 'world:get-by-novel',
  WORLD_SAVE: 'world:save',

  OUTLINE_GET: 'outline:get',
  OUTLINE_SAVE: 'outline:save',

  CHECKPOINT_CREATE: 'checkpoint:create',
  CHECKPOINT_LIST: 'checkpoint:list',
  CHECKPOINT_RESTORE: 'checkpoint:restore',

  SESSION_CREATE: 'session:create',
  SESSION_LIST: 'session:list',

  SKILL_LIST: 'skill:list',
  SKILL_GET: 'skill:get',
  SKILL_INVOKE: 'skill:invoke',

  LEARNING_RECORD: 'learning:record',
  LEARNING_ANALYZE: 'learning:analyze',
  LEARNING_SUMMARY: 'learning:summary',
  MEMORY_SEARCH: 'memory:search',

  WRITER_MODEL_GET: 'writer-model:get',
  WRITER_MODEL_SAVE: 'writer-model:save',

  LLM_CHAT: 'llm:chat',
  LLM_CHAT_STREAM: 'llm:chat-stream',
  LLM_CANCEL_STREAM: 'llm:cancel-stream',
  LLM_CHUNK: 'llm:chunk',
  LLM_DONE: 'llm:done',
  LLM_ERROR: 'llm:error',
  LLM_CONFIG: 'llm:config',
  LLM_IS_CONFIGURED: 'llm:is-configured',
  LLM_CONFIG_META: 'llm:config-meta',

  DB_TABLES: 'db:tables',

  EXPORT_PROJECT: 'export:project',

  STORAGE_ENCRYPT_SET: 'storage:encryptSet',
  STORAGE_ENCRYPT_GET: 'storage:encryptGet',
  STORAGE_ENCRYPT_REMOVE: 'storage:encryptRemove',

  MONITOR_MEMORY_USAGE: 'monitor:memory-usage'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

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
