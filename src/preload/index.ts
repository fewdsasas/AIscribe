import { contextBridge, ipcRenderer } from 'electron'
import type {
  CreateChapterData,
  CreateCharacterData,
  CreateCheckpointData,
  CreateNovelData,
  CreateProjectData,
  CreateSessionData,
  ExportResult,
  RecordLearningData,
  SaveOutlineData,
  SavePlotStructureData,
  SaveWorldData,
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

const api = {
  projectCreate: (data: CreateProjectData) => ipcRenderer.invoke('project:create', data),
  projectList: () => ipcRenderer.invoke('project:list'),
  projectDashboardStats: () => ipcRenderer.invoke('project:dashboard-stats'),
  projectGet: (id: string) => ipcRenderer.invoke('project:get', id),
  projectUpdate: (id: string, data: UpdateProjectData) => ipcRenderer.invoke('project:update', id, data),
  projectDelete: (id: string) => ipcRenderer.invoke('project:delete', id),

  novelCreate: (data: CreateNovelData) => ipcRenderer.invoke('novel:create', data),
  novelGet: (id: string) => ipcRenderer.invoke('novel:get', id),
  novelGetByProject: (projectId: string) => ipcRenderer.invoke('novel:get-by-project', projectId),

  chapterCreate: (data: CreateChapterData) => ipcRenderer.invoke('chapter:create', data),
  chapterList: (novelId: string) => ipcRenderer.invoke('chapter:list', novelId),
  chapterListWithContent: (novelId: string) => ipcRenderer.invoke('chapter:list-with-content', novelId),
  chapterGet: (id: string) => ipcRenderer.invoke('chapter:get', id),
  chapterUpdate: (id: string, data: UpdateChapterData) => ipcRenderer.invoke('chapter:update', id, data),
  chapterCounts: (novelIds: string[]) => ipcRenderer.invoke('chapter:counts', novelIds),

  characterCreate: (data: CreateCharacterData) => ipcRenderer.invoke('character:create', data),
  characterList: (novelId: string) => ipcRenderer.invoke('character:list', novelId),

  plotStructureGetByNovel: (novelId: string) => ipcRenderer.invoke('plot-structure:get-by-novel', novelId),
  plotStructureSave: (data: SavePlotStructureData) => ipcRenderer.invoke('plot-structure:save', data),

  worldGetByNovel: (novelId: string) => ipcRenderer.invoke('world:get-by-novel', novelId),
  worldSave: (data: SaveWorldData) => ipcRenderer.invoke('world:save', data),

  checkpointCreate: (data: CreateCheckpointData) => ipcRenderer.invoke('checkpoint:create', data),
  checkpointList: (projectId: string) => ipcRenderer.invoke('checkpoint:list', projectId),
  checkpointRestore: (id: string) => ipcRenderer.invoke('checkpoint:restore', id),

  sessionCreate: (data: CreateSessionData) => ipcRenderer.invoke('session:create', data),
  sessionList: (projectId: string) => ipcRenderer.invoke('session:list', projectId),

  skillList: () => ipcRenderer.invoke('skill:list'),
  skillGet: (name: string) => ipcRenderer.invoke('skill:get', name),
  skillInvoke: (name: string, input: { prompt: string }): Promise<SkillInvokeResult> =>
    ipcRenderer.invoke('skill:invoke', name, input),

  learningRecord: (data: RecordLearningData) => ipcRenderer.invoke('learning:record', data),
  learningAnalyze: (projectId: string) => ipcRenderer.invoke('learning:analyze', projectId),
  learningSummary: (projectId: string) => ipcRenderer.invoke('learning:summary', projectId),
  memorySearch: (projectId: string, query: string) => ipcRenderer.invoke('memory:search', projectId, query),

  outlineGet: (novelId: string) => ipcRenderer.invoke('outline:get', novelId),
  outlineSave: (data: SaveOutlineData) => ipcRenderer.invoke('outline:save', data),

  writerModelGet: (writerId: string) => ipcRenderer.invoke('writer-model:get', writerId),
  writerModelSave: (profile: Record<string, unknown>) => ipcRenderer.invoke('writer-model:save', profile),

  llmChat: (request: LLMRequest): Promise<LLMResponse> => ipcRenderer.invoke('llm:chat', request),
  llmConfig: (config: LLMConfig) => ipcRenderer.invoke('llm:config', config),
  llmIsConfigured: () => ipcRenderer.invoke('llm:is-configured'),
  llmConfigMeta: () => ipcRenderer.invoke('llm:config-meta'),
  llmTestConnection: (config: LLMConfig) => ipcRenderer.invoke('llm:test-connection', config),
  startLLMStream: (request: LLMRequest) => ipcRenderer.invoke('llm:chat-stream', request),
  cancelLLMStream: (requestId: string) => ipcRenderer.invoke('llm:cancel-stream', requestId),
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

  dbTables: () => ipcRenderer.invoke('db:tables'),

  exportProject: (options: { projectId: string; format: string; includeSynopsis?: boolean }): Promise<ExportResult> =>
    ipcRenderer.invoke('export:project', options),

  // Secure encrypted storage
  secureStorageSet: (key: string, value: string) => ipcRenderer.invoke('storage:encryptSet', key, value),
  secureStorageGet: (key: string) => ipcRenderer.invoke('storage:encryptGet', key),
  secureStorageRemove: (key: string) => ipcRenderer.invoke('storage:encryptRemove', key),

  // Memory monitoring
  getMemoryUsage: () => ipcRenderer.invoke('monitor:memory-usage')
}

contextBridge.exposeInMainWorld('aiscribe', api)
