// AIscribe Core Types

// ===== Project & Workspace =====

export interface Project {
  id: string
  name: string
  description: string
  cover?: string
  genre: string
  createdAt: string
  updatedAt: string
  status: ProjectStatus
  wordCount: number
  targetWordCount?: number
  novelId?: string
}

export type ProjectStatus = 'planning' | 'outlining' | 'writing' | 'revising' | 'completed' | 'on_hold'

// ===== Novel =====

export interface Novel {
  id: string
  projectId: string
  title: string
  author: string
  synopsis: string
  genre: string
  tags: string[]
  targetAudience: string
  createdAt: string
  updatedAt: string
}

export interface Chapter {
  id: string
  novelId: string
  title: string
  content: string
  sortOrder: number
  wordCount: number
  status: ChapterStatus
  createdAt: string
  updatedAt: string
  notes?: string
}

/**
 * 章节精简信息（不含 content），用于列表展示场景，降低 IPC 与内存开销。
 * 完整章节内容通过 chapterGet(id) 单独获取。
 */
export interface ChapterSummary {
  id: string
  novelId: string
  title: string
  sortOrder: number
  wordCount: number
  status: ChapterStatus
  createdAt: string
  updatedAt: string
  notes?: string
}

export type ChapterStatus = 'draft' | 'revised' | 'polished' | 'final'

// ===== Character =====

export interface Character {
  id: string
  novelId: string
  name: string
  aliases: string[]
  role: CharacterRole
  age?: number
  gender?: string
  occupation?: string
  personality: PersonalityProfile
  background: string
  appearance: string
  abilities: string[]
  goals: string[]
  fears: string[]
  secrets: string[]
  arc: CharacterArc
  relationships: CharacterRelationship[]
  dialogueVoice?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export type CharacterRole =
  | 'protagonist'
  | 'antagonist'
  | 'supporting'
  | 'love_interest'
  | 'mentor'
  | 'sidekick'
  | 'foil'
  | 'confidant'
  | 'villain'
  | 'minor'

export interface PersonalityProfile {
  mbti?: string
  enneagram?: string
  traits: string[]
  virtues: string[]
  flaws: string[]
  motivations: string[]
  coreBelief: string
  innerConflict?: string
}

export interface CharacterArc {
  type: 'positive' | 'negative' | 'static'
  startingState: string
  endingState: string
  catalyst: string
  keyMoments: string[]
}

export interface CharacterRelationship {
  targetId: string
  type: string
  description: string
  intensity: number
}

// ===== World Building =====

export interface World {
  id: string
  novelId: string
  name: string
  type: WorldType
  geography: Geography
  history: WorldHistory[]
  society: Society
  powerSystem?: PowerSystem
  technology: TechnologyLevel
  economy: Economy
  consistency: ConsistencyCheck[]
  createdAt: string
  updatedAt: string
}

export type WorldType = 'fantasy' | 'sci_fi' | 'historical' | 'modern' | 'alternate_history' | 'hybrid'

export interface Geography {
  description: string
  climate: string
  keyLocations: Location[]
}

export interface Location {
  id: string
  name: string
  type: string
  description: string
  significance: string
}

export interface WorldHistory {
  era: string
  events: string[]
  significance: string
}

export interface Society {
  government: string
  socialClasses: string[]
  laws: string[]
  culture: string
  dailyLife: string
}

export interface PowerSystem {
  name: string
  rules: string[]
  limitations: string[]
  costs: string[]
  source: string
}

export type TechnologyLevel =
  | 'primitive'
  | 'medieval'
  | 'renaissance'
  | 'industrial'
  | 'modern'
  | 'futuristic'
  | 'mixed'

export interface Economy {
  currency: string
  resources: string[]
  trade: string
  occupations: string[]
}

export interface ConsistencyCheck {
  category: string
  status: 'pass' | 'warning' | 'fail'
  description: string
}

// ===== Plot Structure =====

export type NarrativeFramework =
  | 'three_act'
  | 'hero_journey'
  | 'save_cat'
  | 'seven_point'
  | 'snowflake'
  | 'story_circle'
  | 'story_grid'
  | 'dramatica'

export interface PlotStructure {
  id: string
  novelId: string
  framework: NarrativeFramework
  beats: PlotBeat[]
  notes: string
}

export interface PlotBeat {
  id: string
  name: string
  description: string
  sortOrder: number
  chapterIds: string[]
  emotionalIntensity: number
  status: 'planned' | 'drafted' | 'revised'
}

// ===== Project Outline =====

export interface Outline {
  id: string
  novelId: string
  type: 'brief' | 'detailed'
  content: string
  structure: OutlineSection[]
  version: number
  createdAt: string
  updatedAt: string
}

export interface OutlineSection {
  id: string
  title: string
  content: string
  sortOrder: number
  wordCount: number
  phase: 'beginning' | 'middle' | 'ending'
  keyPoints: string[]
}

// ===== Memory & Checkpoint =====

export interface Checkpoint {
  id: string
  projectId: string
  label: string
  description: string
  snapshot: CheckpointSnapshot
  createdAt: string
  tags: string[]
}

export interface CheckpointSnapshot {
  novel: string
  characters: string
  worlds: string
  plots: string
  outline: string
}

export interface SessionMemory {
  id: string
  projectId: string
  sessionId: string
  queries: SessionQuery[]
  summary: string
  createdAt: string
  updatedAt: string
}

export interface SessionQuery {
  role: 'user' | 'assistant' | 'system'
  content: string
  skillId?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

// ===== Skill System =====

export interface SkillDefinition {
  name: string
  description: string
  parameters?: SkillParameter[]
  category: SkillCategory
}

export interface SkillParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'select'
  description: string
  required: boolean
  default?: unknown
  options?: string[]
}

export type SkillCategory =
  | 'planning'
  | 'structure'
  | 'character'
  | 'world'
  | 'writing'
  | 'revision'
  | 'analysis'
  | 'market'
  | 'master'

// ===== LLM =====

export type LLMProvider = 'openai' | 'claude' | 'mimo' | 'wenxin' | 'tongyi' | 'custom'

export interface LLMConfig {
  provider: LLMProvider
  apiKey: string
  model: string
  baseUrl?: string
  temperature?: number
  maxTokens?: number
}

export interface LLMRequest {
  messages: LLMMessage[]
  system?: string
  skill?: string
  stream?: boolean
  requestId?: string
}

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface LLMResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface WriterProfile {
  writerId: string
  frequentSkills: { skillId: string; count: number; lastUsed: string }[]
  stylePreferences: {
    preferredSkills: string[]
    averageSessionDuration: number
    typicalQueryLength: number
  }
  timeDistribution: {
    totalSessions: number
    totalDuration: number
    averagePerSession: number
    skillsUsed: string[]
  }
  lastUpdated: string
}

export interface NextAction {
  suggestedSkill: string
  reason: string
  confidence: number
}

export interface TrajectoryEntry {
  id: string
  projectId: string
  sessionId: string
  skillId: string
  query: string
  response: string
  duration: number
  timestamp: string
  context: Record<string, unknown>
}

export interface CompressionResult {
  originalCount: number
  compressedCount: number
  summary: string
  entries: TrajectoryEntry[]
}
