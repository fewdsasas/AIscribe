import type { Database as SqlJsDatabase } from 'sql.js'
import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { logger } from '../utils/logger'
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
  World
} from '../../shared/types'
import type { WriterProfile } from '../../shared/types'
import type { IDatabase } from '../di/service-interfaces'
import {
  ChapterRepository,
  CharacterRepository,
  CheckpointRepository,
  NovelRepository,
  OutlineRepository,
  PlotStructureRepository,
  ProjectRepository,
  SessionMemoryRepository,
  TrajectoryRepository,
  WorldRepository,
  WriterModelRepository
} from './repositories'
import type {
  IChapterRepository,
  ICharacterRepository,
  ICheckpointRepository,
  INovelRepository,
  IOutlineRepository,
  IPlotStructureRepository,
  IProjectRepository,
  ISessionMemoryRepository,
  ITrajectoryRepository,
  IWorldRepository,
  IWriterModelRepository
} from './repositories/repository-interfaces'
import { OperationLog } from './operation-log'

const SCHEMA_VERSION = 3

const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY);
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '',
    cover TEXT, genre TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'planning',
    word_count INTEGER DEFAULT 0, target_word_count INTEGER, novel_id TEXT
  );
  CREATE TABLE IF NOT EXISTS novels (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL,
    author TEXT DEFAULT '', synopsis TEXT DEFAULT '', genre TEXT DEFAULT '',
    tags TEXT DEFAULT '[]', target_audience TEXT DEFAULT '',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY, novel_id TEXT NOT NULL, title TEXT NOT NULL,
    content TEXT DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0,
    word_count INTEGER DEFAULT 0, status TEXT DEFAULT 'draft',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, notes TEXT,
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY, novel_id TEXT NOT NULL, name TEXT NOT NULL,
    aliases TEXT DEFAULT '[]', role TEXT DEFAULT 'minor', age INTEGER,
    gender TEXT, occupation TEXT, personality TEXT DEFAULT '{}',
    background TEXT DEFAULT '', appearance TEXT DEFAULT '',
    abilities TEXT DEFAULT '[]', goals TEXT DEFAULT '[]',
    fears TEXT DEFAULT '[]', secrets TEXT DEFAULT '[]',
    arc TEXT DEFAULT '{}', relationships TEXT DEFAULT '[]',
    dialogue_voice TEXT, notes TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS worlds (
    id TEXT PRIMARY KEY, novel_id TEXT NOT NULL, name TEXT NOT NULL,
    type TEXT DEFAULT 'fantasy', geography TEXT DEFAULT '{}',
    history TEXT DEFAULT '[]', society TEXT DEFAULT '{}',
    power_system TEXT, technology TEXT DEFAULT 'medieval',
    economy TEXT DEFAULT '{}', consistency TEXT DEFAULT '[]',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS plot_structures (
    id TEXT PRIMARY KEY, novel_id TEXT NOT NULL, framework TEXT NOT NULL,
    beats TEXT DEFAULT '[]', notes TEXT DEFAULT '',
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS outlines (
    id TEXT PRIMARY KEY, novel_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'brief', content TEXT DEFAULT '',
    structure TEXT DEFAULT '[]', version INTEGER DEFAULT 1,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS checkpoints (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL, label TEXT NOT NULL,
    description TEXT DEFAULT '', snapshot TEXT NOT NULL,
    created_at TEXT NOT NULL, tags TEXT DEFAULT '[]',
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS session_memories (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL, session_id TEXT NOT NULL,
    queries TEXT DEFAULT '[]', summary TEXT DEFAULT '',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS writer_models (
    writer_id TEXT PRIMARY KEY, preferences TEXT DEFAULT '{}',
    style_profile TEXT DEFAULT '{}', habits TEXT DEFAULT '{}',
    pattern_knowledge TEXT DEFAULT '[]', created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`

const MIGRATIONS: Record<number, (db: SqlJsDatabase) => void> = {
  2: (db: SqlJsDatabase) => {
    db.run(`CREATE TABLE IF NOT EXISTS trajectories (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      query TEXT NOT NULL,
      response TEXT,
      duration INTEGER DEFAULT 0,
      timestamp TEXT NOT NULL,
      context TEXT DEFAULT '{}'
    )`)
    db.run('CREATE INDEX IF NOT EXISTS idx_trajectories_project ON trajectories(project_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_trajectories_skill ON trajectories(skill_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_trajectories_session ON trajectories(session_id)')
    try {
      db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS trajectories_fts USING fts5(
        project_id, query, response, skill_id,
        content='trajectories',
        content_rowid='rowid',
        tokenize='unicode61'
      )`)
    } catch {
      /* FTS5 may not be available */
    }
  },
  3: (db: SqlJsDatabase) => {
    db.run('CREATE INDEX IF NOT EXISTS idx_novels_project ON novels(project_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_chapters_novel ON chapters(novel_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_characters_novel ON characters(novel_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_worlds_novel ON worlds(novel_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_plot_structures_novel ON plot_structures(novel_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_outlines_novel ON outlines(novel_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_checkpoints_project ON checkpoints(project_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_session_memories_project ON session_memories(project_id)')
  }
}

export class Database implements IDatabase {
  private _db: SqlJsDatabase | null = null
  private dbPath: string
  private initialized = false
  private operationLog: OperationLog | null = null
  private saveTimeout: ReturnType<typeof setTimeout> | null = null

  // Repositories (initialized lazily)
  private _projectRepo: IProjectRepository | null = null
  private _novelRepo: INovelRepository | null = null
  private _chapterRepo: IChapterRepository | null = null
  private _characterRepo: ICharacterRepository | null = null
  private _worldRepo: IWorldRepository | null = null
  private _checkpointRepo: ICheckpointRepository | null = null
  private _outlineRepo: IOutlineRepository | null = null
  private _sessionMemoryRepo: ISessionMemoryRepository | null = null
  private _plotStructureRepo: IPlotStructureRepository | null = null
  private _writerModelRepo: IWriterModelRepository | null = null
  private _trajectoryRepo: ITrajectoryRepository | null = null

  private constructor(dbPath: string) {
    this.dbPath = dbPath
  }

  /** Access the raw sql.js database instance (for direct queries) */
  private get sqlDb(): SqlJsDatabase {
    if (!this._db) throw new Error('Database not initialized')
    return this._db
  }

  /** Inject operation log into a repository instance */
  private injectLog<
    T extends { setOperationLog?: (log: OperationLog) => void; setSaveCallback?: (cb: () => void) => void }
  >(repo: T): T {
    if (repo.setOperationLog && this.operationLog) {
      repo.setOperationLog(this.operationLog)
    }
    if (repo.setSaveCallback) {
      repo.setSaveCallback(() => this.scheduleSave())
    }
    return repo
  }

  /** Lazy-initialized repositories */
  get projects(): IProjectRepository {
    if (!this._projectRepo) this._projectRepo = this.injectLog(new ProjectRepository(this.sqlDb))
    return this._projectRepo
  }

  get novels(): INovelRepository {
    if (!this._novelRepo) this._novelRepo = this.injectLog(new NovelRepository(this.sqlDb))
    return this._novelRepo
  }

  get chapters(): IChapterRepository {
    if (!this._chapterRepo) this._chapterRepo = this.injectLog(new ChapterRepository(this.sqlDb))
    return this._chapterRepo
  }

  get characters(): ICharacterRepository {
    if (!this._characterRepo) this._characterRepo = this.injectLog(new CharacterRepository(this.sqlDb))
    return this._characterRepo
  }

  get worlds(): IWorldRepository {
    if (!this._worldRepo) this._worldRepo = this.injectLog(new WorldRepository(this.sqlDb))
    return this._worldRepo
  }

  get checkpoints(): ICheckpointRepository {
    if (!this._checkpointRepo) this._checkpointRepo = this.injectLog(new CheckpointRepository(this.sqlDb))
    return this._checkpointRepo
  }

  get outlines(): IOutlineRepository {
    if (!this._outlineRepo) this._outlineRepo = this.injectLog(new OutlineRepository(this.sqlDb))
    return this._outlineRepo
  }

  get sessionMemories(): ISessionMemoryRepository {
    if (!this._sessionMemoryRepo) this._sessionMemoryRepo = this.injectLog(new SessionMemoryRepository(this.sqlDb))
    return this._sessionMemoryRepo
  }

  get plotStructures(): IPlotStructureRepository {
    if (!this._plotStructureRepo) this._plotStructureRepo = this.injectLog(new PlotStructureRepository(this.sqlDb))
    return this._plotStructureRepo
  }

  get writerModels(): IWriterModelRepository {
    if (!this._writerModelRepo) this._writerModelRepo = this.injectLog(new WriterModelRepository(this.sqlDb))
    return this._writerModelRepo
  }

  get trajectories(): ITrajectoryRepository {
    if (!this._trajectoryRepo) this._trajectoryRepo = this.injectLog(new TrajectoryRepository(this.sqlDb))
    return this._trajectoryRepo
  }

  static async create(dbPath: string): Promise<Database> {
    const SQL = await initSqlJs()
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    let sqlDb: SqlJsDatabase
    if (fs.existsSync(dbPath)) {
      sqlDb = new SQL.Database(fs.readFileSync(dbPath))
    } else {
      sqlDb = new SQL.Database()
    }

    const db = new Database(dbPath)
    db._db = sqlDb
    db.operationLog = new OperationLog(dbPath)
    db.operationLog.replay(sqlDb)
    db.initialize()
    // Best-effort TTL cleanup of stale trajectories; safe to ignore failures
    // (table may not exist on a pre-v2 DB, or cleanup is a no-op on fresh DBs).
    try {
      db.cleanupOldTrajectories()
    } catch (e) {
      logger.error('Initial trajectory cleanup failed:', e)
    }
    return db
  }

  private initialize(): void {
    this.sqlDb.run('PRAGMA foreign_keys = ON')
    // Memory optimization: temp tables/indexes in memory; cap sql.js heap to ~50MB (advisory)
    this.sqlDb.run('PRAGMA temp_store = MEMORY')
    this.sqlDb.run('PRAGMA soft_heap_limit = 50000000')
    this.sqlDb.exec(CREATE_TABLES_SQL)

    const versionResult = this.sqlDb.exec('SELECT version FROM schema_version')
    let currentVersion = 0
    if (versionResult.length > 0 && versionResult[0].values.length > 0) {
      currentVersion = versionResult[0].values[0][0] as number
    }

    for (let v = currentVersion + 1; v <= SCHEMA_VERSION; v++) {
      const migration = MIGRATIONS[v]
      if (migration) {
        this.sqlDb.run('BEGIN TRANSACTION')
        try {
          migration(this.sqlDb)
          this.sqlDb.run('UPDATE schema_version SET version = ?', [v])
          this.sqlDb.run('COMMIT')
        } catch (e) {
          try {
            this.sqlDb.run('ROLLBACK')
          } catch {
            /* ignore */
          }
          logger.error(`Schema migration v${v} failed:`, e)
          throw e
        }
      }
    }

    if (currentVersion === 0) {
      this.sqlDb.run('INSERT OR IGNORE INTO schema_version (version) VALUES (?)', [SCHEMA_VERSION])
    }

    try {
      this.save()
    } catch (e) {
      logger.error('Database initial save failed:', e)
      throw e
    }
    this.initialized = true
  }

  /**
   * Save the database to disk and clear operation log.
   *
   * Memory note: `sqlDb.export()` allocates a fresh Uint8Array holding the
   * full DB image (~ size of all data). Previously we wrapped it with
   * `Buffer.from(data)`, which copied the bytes again and tripled peak memory
   * (sql.js internal buffer + exported Uint8Array + Node Buffer).
   * fs.writeFileSync accepts any ArrayBufferView/Uint8Array directly, so we
   * write `data` itself to avoid the second copy. The local `data` reference
   * goes out of scope after writeFileSync returns, allowing GC to reclaim it
   * before the synchronous rename.
   */
  save(): void {
    const data = this.sqlDb.export()
    const tmpPath = this.dbPath + '.tmp'
    fs.writeFileSync(tmpPath, data)
    fs.renameSync(tmpPath, this.dbPath)
    this.operationLog?.clear()
  }

  /**
   * Delete trajectory records older than `daysToKeep` days.
   * Called once on Database.create() to bound growth of the trajectories
   * table (which can grow unbounded via learning recorder). Safe to call
   * even if the table does not exist yet — invoked after migrations run.
   * Returns the number of rows deleted.
   *
   * Note: the trajectories table stores its creation time in the `timestamp`
   * column (ISO string), not `created_at`. sql.js' exec() does not surface
   * an affected-row count on its result objects, so we COUNT first then
   * DELETE — accurate here because create() runs single-threaded.
   */
  cleanupOldTrajectories(daysToKeep = 90): number {
    try {
      const countResult = this.sqlDb.exec(
        `SELECT COUNT(*) AS c FROM trajectories WHERE timestamp < datetime('now', '-${daysToKeep} days')`
      )
      const deleted = countResult.length > 0 ? ((countResult[0].values[0]?.[0] as number) ?? 0) : 0
      if (deleted > 0) {
        this.sqlDb.exec(`DELETE FROM trajectories WHERE timestamp < datetime('now', '-${daysToKeep} days')`)
        this.scheduleSave()
      }
      return deleted
    } catch (e) {
      // Table may not exist on fresh DBs before migration v2; fail silently.
      logger.error('cleanupOldTrajectories failed:', e)
      return 0
    }
  }

  /** Schedule a debounced save (unifies Legacy CRUD with Repository debounce) */
  scheduleSave(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout)
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null
      try {
        this.save()
      } catch (e) {
        logger.error('Database scheduled save failed:', e)
      }
    }, 300)
  }

  close(): void {
    if (this.initialized && this._db) {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout)
        this.saveTimeout = null
      }
      try {
        this.save()
      } catch (e) {
        logger.error('Database flush failed on close:', e)
      }
      this.operationLog?.stopAutoFlush()
      this.operationLog?.flush()
      this._db.close()
      this._db = null
    }
  }

  getSchemaVersion(): number {
    const result = this.sqlDb.exec('SELECT version FROM schema_version')
    if (result.length > 0 && result[0].values.length > 0) {
      return result[0].values[0][0] as number
    }
    return 0
  }

  getTableNames(): string[] {
    const result = this.sqlDb.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    if (result.length === 0 || result[0].values.length === 0) return []
    return result[0].values.map(row => row[0] as string)
  }

  // ===== Backward-compatible CRUD methods (delegate to repositories) =====

  createProject(data: Parameters<ProjectRepository['create']>[0]): Project {
    return this.projects.create(data)
  }

  getProject(id: string): Project | null {
    return this.projects.getById(id)
  }

  listProjects(): Project[] {
    return this.projects.list()
  }

  listProjectsWithStats(): Array<Project & { novelCount: number; chapterCount: number }> {
    return this.projects.listWithStats()
  }

  updateProject(id: string, data: Parameters<ProjectRepository['update']>[1]): void {
    return this.projects.update(id, data)
  }

  deleteProject(id: string): void {
    // sql.js foreign key cascade enforcement is unreliable in some builds,
    // so we explicitly delete child records to guarantee data integrity.
    const novel = this.novels.getByProject(id)
    if (novel) {
      const chapterSql = 'DELETE FROM chapters WHERE novel_id = ?'
      this.operationLog?.append(chapterSql, [novel.id])
      this.sqlDb.run(chapterSql, [novel.id])

      const novelSql = 'DELETE FROM novels WHERE project_id = ?'
      this.operationLog?.append(novelSql, [id])
      this.sqlDb.run(novelSql, [id])
    }
    this.projects.delete(id)
    this.novels.clearCache()
    this.chapters.clearCache()
  }

  createNovel(data: Parameters<NovelRepository['create']>[0]): Novel {
    return this.novels.create(data)
  }

  getNovel(id: string): Novel | null {
    return this.novels.getById(id)
  }

  getNovelByProject(projectId: string): Novel | null {
    return this.novels.getByProject(projectId)
  }

  createChapter(data: Parameters<ChapterRepository['create']>[0]): Chapter {
    return this.chapters.create(data)
  }

  listChapters(novelId: string): ChapterSummary[] {
    return this.chapters.listByNovel(novelId)
  }

  /** 完整章节列表（含 content），供阅读器/导出等需要正文内容的场景使用 */
  listChaptersWithContent(novelId: string): Chapter[] {
    return this.chapters.listByNovelWithContent(novelId)
  }

  getChapter(id: string): Chapter | null {
    return this.chapters.getById(id)
  }

  updateChapter(id: string, data: Parameters<ChapterRepository['update']>[1]): void {
    return this.chapters.update(id, data)
  }

  getChapterCounts(novelIds: string[]): Record<string, number> {
    return this.chapters.getChapterCounts(novelIds)
  }

  createProjectsBatch(projects: Omit<Project, 'createdAt' | 'updatedAt'>[]): Project[] {
    return this.projects.batchCreate(projects)
  }

  createChaptersBatch(chapters: Omit<Chapter, 'createdAt' | 'updatedAt'>[]): Chapter[] {
    return this.chapters.batchCreate(chapters)
  }

  // ===== Delegated methods (route to repositories) =====

  createCharacter(data: Parameters<CharacterRepository['create']>[0]): Character {
    return this.characters.create(data)
  }

  listCharacters(novelId: string): Character[] {
    return this.characters.listByNovel(novelId)
  }

  createCheckpoint(data: Parameters<CheckpointRepository['create']>[0]): Checkpoint {
    return this.checkpoints.create(data)
  }

  listCheckpoints(projectId: string): Checkpoint[] {
    return this.checkpoints.listByProject(projectId)
  }

  getCheckpointSnapshot(id: string): CheckpointSnapshot | null {
    return this.checkpoints.getSnapshot(id)
  }

  createSessionMemory(data: Parameters<SessionMemoryRepository['create']>[0]): SessionMemory {
    return this.sessionMemories.create(data)
  }

  listSessionMemories(projectId: string): SessionMemory[] {
    return this.sessionMemories.listByProject(projectId)
  }

  getPlotStructureByNovel(novelId: string): PlotStructure | null {
    return this.plotStructures.getByNovel(novelId)
  }

  savePlotStructure(data: Parameters<PlotStructureRepository['save']>[0]): PlotStructure {
    return this.plotStructures.save(data)
  }

  getWorldByNovel(novelId: string): World | null {
    return this.worlds.getByNovel(novelId)
  }

  saveWorld(data: Parameters<WorldRepository['save']>[0]): World {
    return this.worlds.save(data)
  }

  getOutline(novelId: string): Outline | null {
    return this.outlines.getByNovel(novelId)
  }

  saveOutline(data: Parameters<OutlineRepository['save']>[0]): Outline {
    return this.outlines.save(data)
  }

  getWriterModel(writerId: string): WriterProfile | null {
    return this.writerModels.getByWriterId(writerId)
  }

  saveWriterModel(profile: WriterProfile): void {
    return this.writerModels.save(profile)
  }
}
