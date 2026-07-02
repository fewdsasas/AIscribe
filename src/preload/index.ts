import { contextBridge, ipcRenderer } from 'electron'
import type {
  AiRepairData,
  AiRepairResult,
  ChunkedExportResult,
  CreateChapterData,
  CreateCharacterData,
  CreateCheckpointData,
  CreateNovelData,
  CreateProjectData,
  CreateSessionData,
  ExportChunk,
  ExportResult,
  ImportNovelData,
  ImportNovelResult,
  OperationResult,
  RecordLearningData,
  SaveOutlineData,
  SavePlotStructureData,
  SaveWorldData,
  SelectNovelFileResult,
  SkillInvokeResult,
  UpdateChapterData,
  UpdateProjectData
} from '../shared/types/ipc'
import type { LLMConfig, LLMRequest, LLMResponse } from '../shared/types'

let llmChunkHandler: ((_event: Electron.IpcRendererEvent, data: { text: string }) => void) | null = null
let llmDoneHandler:
  | ((
      _event: Electron.IpcRendererEvent,
      data: { usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }
    ) => void)
  | null = null
let llmErrorHandler: ((_event: Electron.IpcRendererEvent, data: { message: string }) => void) | null = null
let repairProgressHandler:
  | ((
      _event: Electron.IpcRendererEvent,
      data: { novelId: string; current: number; total: number; action: string }
    ) => void)
  | null = null
let repairDoneHandler:
  | ((_event: Electron.IpcRendererEvent, data: { novelId: string; actionsCount: number }) => void)
  | null = null

function cleanupLLMListeners(): void {
  if (llmChunkHandler) {
    ipcRenderer.removeListener('llm:chunk', llmChunkHandler)
    llmChunkHandler = null
  }
  if (llmDoneHandler) {
    ipcRenderer.removeListener('llm:done', llmDoneHandler)
    llmDoneHandler = null
  }
  if (llmErrorHandler) {
    ipcRenderer.removeListener('llm:error', llmErrorHandler)
    llmErrorHandler = null
  }
}

function cleanupRepairListeners(): void {
  if (repairProgressHandler) {
    ipcRenderer.removeListener('import:repair-progress', repairProgressHandler)
    repairProgressHandler = null
  }
  if (repairDoneHandler) {
    ipcRenderer.removeListener('import:repair-done', repairDoneHandler)
    repairDoneHandler = null
  }
}

const api = {
  projectCreate: (data: CreateProjectData) => ipcRenderer.invoke('project:create', data),
  projectList: () => ipcRenderer.invoke('project:list'),
  projectDashboardStats: () => ipcRenderer.invoke('project:dashboard-stats'),
  projectGet: (id: string) => ipcRenderer.invoke('project:get', { id }),
  projectUpdate: (id: string, data: UpdateProjectData): Promise<OperationResult> =>
    ipcRenderer.invoke('project:update', { id, updates: data }),
  projectDelete: (id: string): Promise<OperationResult> => ipcRenderer.invoke('project:delete', { id }),

  novelCreate: (data: CreateNovelData) => ipcRenderer.invoke('novel:create', data),
  novelGet: (id: string) => ipcRenderer.invoke('novel:get', { id }),
  novelGetByProject: (projectId: string) => ipcRenderer.invoke('novel:get-by-project', { projectId }),
  novelImport: (data: ImportNovelData): Promise<ImportNovelResult> => ipcRenderer.invoke('novel:import', data),
  selectNovelFile: (): Promise<SelectNovelFileResult> => ipcRenderer.invoke('import:select-file'),

  chapterCreate: (data: CreateChapterData) => ipcRenderer.invoke('chapter:create', data),
  chapterList: (novelId: string) => ipcRenderer.invoke('chapter:list', { novelId }),
  chapterListPaginated: (novelId: string, offset: number, limit: number) =>
    ipcRenderer.invoke('chapter:list-paginated', { novelId, offset, limit }),
  chapterCount: (novelId: string) => ipcRenderer.invoke('chapter:count', { novelId }),
  chapterListWithContent: (novelId: string) => ipcRenderer.invoke('chapter:list-with-content', { novelId }),
  chapterGet: (id: string) => ipcRenderer.invoke('chapter:get', { id }),
  chapterUpdate: (id: string, data: UpdateChapterData): Promise<OperationResult> =>
    ipcRenderer.invoke('chapter:update', { id, updates: data }),
  chapterCounts: (novelIds: string[]) => ipcRenderer.invoke('chapter:counts', { novelIds }),

  characterCreate: (data: CreateCharacterData) => ipcRenderer.invoke('character:create', data),
  characterList: (novelId: string) => ipcRenderer.invoke('character:list', { novelId }),

  plotStructureGetByNovel: (novelId: string) => ipcRenderer.invoke('plotStructure:get-by-novel', { novelId }),
  plotStructureSave: (data: SavePlotStructureData) => ipcRenderer.invoke('plotStructure:save', data),

  worldGetByNovel: (novelId: string) => ipcRenderer.invoke('world:get-by-novel', { novelId }),
  worldSave: (data: SaveWorldData) => ipcRenderer.invoke('world:save', data),

  checkpointCreate: (data: CreateCheckpointData) => ipcRenderer.invoke('checkpoint:create', data),
  checkpointList: (projectId: string) => ipcRenderer.invoke('checkpoint:list', { projectId }),
  checkpointRestore: (id: string) => ipcRenderer.invoke('checkpoint:restore', { id }),

  sessionCreate: (data: CreateSessionData) => ipcRenderer.invoke('session:create', data),
  sessionList: (projectId: string) => ipcRenderer.invoke('session:list', { projectId }),

  skillList: () => ipcRenderer.invoke('skill:list'),
  skillGet: (name: string) => ipcRenderer.invoke('skill:get', { name }),
  skillInvoke: (name: string, input: { prompt: string }): Promise<SkillInvokeResult> =>
    ipcRenderer.invoke('skill:invoke', { name, prompt: input.prompt }),

  learningRecord: (data: RecordLearningData): Promise<OperationResult> => ipcRenderer.invoke('learning:record', data),
  learningAnalyze: (projectId: string) => ipcRenderer.invoke('learning:analyze', { projectId }),
  learningSummary: (projectId: string) => ipcRenderer.invoke('learning:summary', { projectId }),
  memorySearch: (projectId: string, query: string) => ipcRenderer.invoke('memory:search', { projectId, query }),

  outlineGet: (novelId: string) => ipcRenderer.invoke('outline:get', { novelId }),
  outlineSave: (data: SaveOutlineData) => ipcRenderer.invoke('outline:save', data),

  writerModelGet: (writerId: string) => ipcRenderer.invoke('writerModel:get', { writerId }),
  writerModelSave: (profile: Record<string, unknown>) => ipcRenderer.invoke('writerModel:save', profile),

  llmChat: (request: LLMRequest): Promise<LLMResponse> => ipcRenderer.invoke('llm:chat', request),
  llmConfig: (config: LLMConfig): Promise<OperationResult> => ipcRenderer.invoke('llm:config', config),
  llmIsConfigured: () => ipcRenderer.invoke('llm:is-configured'),
  llmConfigMeta: () => ipcRenderer.invoke('llm:config-meta'),
  llmTestConnection: (config: LLMConfig) => ipcRenderer.invoke('llm:test-connection', config),
  startLLMStream: (request: LLMRequest) => ipcRenderer.invoke('llm:chat-stream', request),
  cancelLLMStream: (requestId: string) => ipcRenderer.invoke('llm:cancel-stream', { requestId }),
  onLLMChunk: (callback: (chunk: string) => void) => {
    if (llmChunkHandler) {
      ipcRenderer.removeListener('llm:chunk', llmChunkHandler)
      llmChunkHandler = null
    }
    llmChunkHandler = (_event, data) => callback(data.text)
    ipcRenderer.on('llm:chunk', llmChunkHandler)
  },
  onLLMDone: (
    callback: (data: { usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }) => void
  ) => {
    if (llmDoneHandler) {
      ipcRenderer.removeListener('llm:done', llmDoneHandler)
      llmDoneHandler = null
    }
    llmDoneHandler = (_event, data) => callback(data)
    ipcRenderer.on('llm:done', llmDoneHandler)
  },
  onLLMError: (callback: (error: string) => void) => {
    if (llmErrorHandler) {
      ipcRenderer.removeListener('llm:error', llmErrorHandler)
      llmErrorHandler = null
    }
    llmErrorHandler = (_event, data) => callback(data.message)
    ipcRenderer.on('llm:error', llmErrorHandler)
  },
  removeLLMListeners: () => cleanupLLMListeners(),
  removeRepairListeners: () => cleanupRepairListeners(),

  dbTables: () => ipcRenderer.invoke('db:tables'),

  exportProject: async (options: {
    projectId: string
    format: string
    includeSynopsis?: boolean
  }): Promise<ExportResult> => {
    const first = (await ipcRenderer.invoke('export:project', options)) as ChunkedExportResult
    if (!first.chunked) {
      return { content: first.content, filename: first.filename }
    }
    const chunks: string[] = []
    for (let i = 0; i < first.totalChunks; i++) {
      const part = (await ipcRenderer.invoke('export:project:chunk', {
        chunkId: first.chunkId,
        index: i
      })) as ExportChunk
      chunks[part.index] = part.data
    }
    return { content: chunks.join(''), filename: first.filename }
  },

  // Secure encrypted storage
  secureStorageSet: (key: string, value: string): Promise<OperationResult> =>
    ipcRenderer.invoke('storage:encryptSet', { key, value }),
  secureStorageGet: (key: string) => ipcRenderer.invoke('storage:encryptGet', { key }),
  secureStorageRemove: (key: string): Promise<OperationResult> => ipcRenderer.invoke('storage:encryptRemove', { key }),

  // Memory monitoring
  getMemoryUsage: () => ipcRenderer.invoke('monitor:memory-usage'),

  // AI structure repair
  triggerAiRepair: (data: AiRepairData): Promise<AiRepairResult> => ipcRenderer.invoke('import:ai-repair', data),
  onRepairProgress: (callback: (data: { novelId: string; current: number; total: number; action: string }) => void) => {
    if (repairProgressHandler) {
      ipcRenderer.removeListener('import:repair-progress', repairProgressHandler)
      repairProgressHandler = null
    }
    repairProgressHandler = (_event, data) => callback(data)
    ipcRenderer.on('import:repair-progress', repairProgressHandler)
  },
  onRepairDone: (callback: (data: { novelId: string; actionsCount: number }) => void) => {
    if (repairDoneHandler) {
      ipcRenderer.removeListener('import:repair-done', repairDoneHandler)
      repairDoneHandler = null
    }
    repairDoneHandler = (_event, data) => callback(data)
    ipcRenderer.on('import:repair-done', repairDoneHandler)
  }
}

contextBridge.exposeInMainWorld('aiscribe', api)
