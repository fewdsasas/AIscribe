import type {
  Chapter,
  ChapterSummary,
  Character,
  Checkpoint,
  CheckpointSnapshot,
  Novel,
  Outline,
  PlotStructure,
  Project,
  SessionMemory,
  TrajectoryEntry,
  World,
  WriterProfile
} from '../../../shared/types'

export interface IProjectRepository {
  create(data: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>> & { id?: string }): Project
  getById(id: string): Project | null
  list(): Project[]
  listWithStats(): Array<Project & { novelCount: number; chapterCount: number }>
  update(id: string, data: Partial<Omit<Project, 'id' | 'createdAt'>>): void
  delete(id: string): void
  batchCreate(projects: Omit<Project, 'createdAt' | 'updatedAt'>[]): Project[]
}

export interface IChapterRepository {
  create(data: Partial<Omit<Chapter, 'id' | 'createdAt' | 'updatedAt'>> & { id?: string }): Chapter
  listByNovel(novelId: string): ChapterSummary[]
  listByNovelWithContent(novelId: string): Chapter[]
  getById(id: string): Chapter | null
  update(id: string, data: Partial<Omit<Chapter, 'id' | 'createdAt' | 'novelId'>>): void
  getChapterCounts(novelIds: string[]): Record<string, number>
  batchCreate(chapters: Omit<Chapter, 'createdAt' | 'updatedAt'>[]): Chapter[]
  clearCache(): void
}

export interface INovelRepository {
  create(data: Partial<Omit<Novel, 'id' | 'createdAt' | 'updatedAt'>> & { id?: string }): Novel
  getById(id: string): Novel | null
  getByProject(projectId: string): Novel | null
  clearCache(): void
}

export interface ICharacterRepository {
  create(data: Partial<Omit<Character, 'id' | 'createdAt' | 'updatedAt'>> & { id?: string }): Character
  listByNovel(novelId: string): Character[]
}

export interface IWorldRepository {
  getByNovel(novelId: string): World | null
  save(data: Partial<Omit<World, 'id' | 'createdAt' | 'updatedAt'>> & { id?: string }): World
}

export interface IPlotStructureRepository {
  getByNovel(novelId: string): PlotStructure | null
  save(data: Partial<Omit<PlotStructure, 'id'>> & { id?: string }): PlotStructure
}

export interface IOutlineRepository {
  getByNovel(novelId: string): Outline | null
  save(data: Partial<Omit<Outline, 'id' | 'createdAt' | 'updatedAt'>> & { id?: string }): Outline
}

export interface ICheckpointRepository {
  create(data: Partial<Omit<Checkpoint, 'id' | 'createdAt'>> & { id?: string }): Checkpoint
  listByProject(projectId: string): Checkpoint[]
  getSnapshot(id: string): CheckpointSnapshot | null
}

export interface ISessionMemoryRepository {
  create(data: Partial<Omit<SessionMemory, 'id' | 'createdAt' | 'updatedAt'>> & { id?: string }): SessionMemory
  listByProject(projectId: string): SessionMemory[]
}

export interface IWriterModelRepository {
  getByWriterId(writerId: string): WriterProfile | null
  save(profile: WriterProfile): void
}

export interface ITrajectoryRepository {
  record(data: Omit<TrajectoryEntry, 'id' | 'timestamp'>): TrajectoryEntry
  getByProject(projectId: string, limit?: number): TrajectoryEntry[]
  getBySkill(skillId: string, limit?: number): TrajectoryEntry[]
  getBySession(sessionId: string): TrajectoryEntry[]
  countByProject(projectId: string): number
  getLastActiveByProject(projectId: string): string | null
  detectPatterns(projectId: string): { skillId: string; count: number; ratio: number }[]
  searchMemory(projectId: string, query: string, limit?: number): TrajectoryEntry[]
}
