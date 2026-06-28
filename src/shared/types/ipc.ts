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
