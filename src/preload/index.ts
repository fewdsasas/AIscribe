import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/types/ipc'
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
    ipcRenderer.removeListener(IPC_CHANNELS.LLM_CHUNK, llmChunkHandler)
    llmChunkHandler = null
  }
  if (llmDoneHandler) {
    ipcRenderer.removeListener(IPC_CHANNELS.LLM_DONE, llmDoneHandler)
    llmDoneHandler = null
  }
  if (llmErrorHandler) {
    ipcRenderer.removeListener(IPC_CHANNELS.LLM_ERROR, llmErrorHandler)
    llmErrorHandler = null
  }
}

const api = {
  projectCreate: (data: CreateProjectData) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_CREATE, data),
  projectList: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_LIST),
  projectDashboardStats: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_DASHBOARD_STATS),
  projectGet: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET, id),
  projectUpdate: (id: string, data: UpdateProjectData) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_UPDATE, id, data),
  projectDelete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_DELETE, id),

  novelCreate: (data: CreateNovelData) => ipcRenderer.invoke(IPC_CHANNELS.NOVEL_CREATE, data),
  novelGet: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.NOVEL_GET, id),
  novelGetByProject: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.NOVEL_GET_BY_PROJECT, projectId),

  chapterCreate: (data: CreateChapterData) => ipcRenderer.invoke(IPC_CHANNELS.CHAPTER_CREATE, data),
  chapterList: (novelId: string) => ipcRenderer.invoke(IPC_CHANNELS.CHAPTER_LIST, novelId),
  chapterListWithContent: (novelId: string) => ipcRenderer.invoke(IPC_CHANNELS.CHAPTER_LIST_WITH_CONTENT, novelId),
  chapterGet: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.CHAPTER_GET, id),
  chapterUpdate: (id: string, data: UpdateChapterData) => ipcRenderer.invoke(IPC_CHANNELS.CHAPTER_UPDATE, id, data),
  chapterCounts: (novelIds: string[]) => ipcRenderer.invoke(IPC_CHANNELS.CHAPTER_COUNTS, novelIds),

  characterCreate: (data: CreateCharacterData) => ipcRenderer.invoke(IPC_CHANNELS.CHARACTER_CREATE, data),
  characterList: (novelId: string) => ipcRenderer.invoke(IPC_CHANNELS.CHARACTER_LIST, novelId),

  plotStructureGetByNovel: (novelId: string) => ipcRenderer.invoke(IPC_CHANNELS.PLOT_STRUCTURE_GET_BY_NOVEL, novelId),
  plotStructureSave: (data: SavePlotStructureData) => ipcRenderer.invoke(IPC_CHANNELS.PLOT_STRUCTURE_SAVE, data),

  worldGetByNovel: (novelId: string) => ipcRenderer.invoke(IPC_CHANNELS.WORLD_GET_BY_NOVEL, novelId),
  worldSave: (data: SaveWorldData) => ipcRenderer.invoke(IPC_CHANNELS.WORLD_SAVE, data),

  checkpointCreate: (data: CreateCheckpointData) => ipcRenderer.invoke(IPC_CHANNELS.CHECKPOINT_CREATE, data),
  checkpointList: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.CHECKPOINT_LIST, projectId),
  checkpointRestore: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.CHECKPOINT_RESTORE, id),

  sessionCreate: (data: CreateSessionData) => ipcRenderer.invoke(IPC_CHANNELS.SESSION_CREATE, data),
  sessionList: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.SESSION_LIST, projectId),

  skillList: () => ipcRenderer.invoke(IPC_CHANNELS.SKILL_LIST),
  skillGet: (name: string) => ipcRenderer.invoke(IPC_CHANNELS.SKILL_GET, name),
  skillInvoke: (name: string, input: { prompt: string }): Promise<SkillInvokeResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.SKILL_INVOKE, name, input),

  learningRecord: (data: RecordLearningData) => ipcRenderer.invoke(IPC_CHANNELS.LEARNING_RECORD, data),
  learningAnalyze: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.LEARNING_ANALYZE, projectId),
  learningSummary: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.LEARNING_SUMMARY, projectId),
  memorySearch: (projectId: string, query: string) => ipcRenderer.invoke(IPC_CHANNELS.MEMORY_SEARCH, projectId, query),

  outlineGet: (novelId: string) => ipcRenderer.invoke(IPC_CHANNELS.OUTLINE_GET, novelId),
  outlineSave: (data: SaveOutlineData) => ipcRenderer.invoke(IPC_CHANNELS.OUTLINE_SAVE, data),

  writerModelGet: (writerId: string) => ipcRenderer.invoke(IPC_CHANNELS.WRITER_MODEL_GET, writerId),
  writerModelSave: (profile: Record<string, unknown>) => ipcRenderer.invoke(IPC_CHANNELS.WRITER_MODEL_SAVE, profile),

  llmChat: (request: LLMRequest): Promise<LLMResponse> => ipcRenderer.invoke(IPC_CHANNELS.LLM_CHAT, request),
  llmConfig: (config: LLMConfig) => ipcRenderer.invoke(IPC_CHANNELS.LLM_CONFIG, config),
  llmIsConfigured: () => ipcRenderer.invoke(IPC_CHANNELS.LLM_IS_CONFIGURED),
  llmConfigMeta: () => ipcRenderer.invoke(IPC_CHANNELS.LLM_CONFIG_META),
  startLLMStream: (request: LLMRequest) => ipcRenderer.invoke(IPC_CHANNELS.LLM_CHAT_STREAM, request),
  cancelLLMStream: (requestId: string) => ipcRenderer.invoke(IPC_CHANNELS.LLM_CANCEL_STREAM, requestId),
  onLLMChunk: (callback: (chunk: string) => void) => {
    if (llmChunkHandler) {
      ipcRenderer.removeListener(IPC_CHANNELS.LLM_CHUNK, llmChunkHandler)
      llmChunkHandler = null
    }
    llmChunkHandler = (_event, data) => callback(data.text)
    ipcRenderer.on(IPC_CHANNELS.LLM_CHUNK, llmChunkHandler)
  },
  onLLMDone: (
    callback: (data: { usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }) => void
  ) => {
    if (llmDoneHandler) {
      ipcRenderer.removeListener(IPC_CHANNELS.LLM_DONE, llmDoneHandler)
      llmDoneHandler = null
    }
    llmDoneHandler = (_event, data) => callback(data)
    ipcRenderer.on(IPC_CHANNELS.LLM_DONE, llmDoneHandler)
  },
  onLLMError: (callback: (error: string) => void) => {
    if (llmErrorHandler) {
      ipcRenderer.removeListener(IPC_CHANNELS.LLM_ERROR, llmErrorHandler)
      llmErrorHandler = null
    }
    llmErrorHandler = (_event, data) => callback(data.message)
    ipcRenderer.on(IPC_CHANNELS.LLM_ERROR, llmErrorHandler)
  },
  removeLLMListeners: () => cleanupLLMListeners(),

  dbTables: () => ipcRenderer.invoke(IPC_CHANNELS.DB_TABLES),

  exportProject: (options: { projectId: string; format: string; includeSynopsis?: boolean }): Promise<ExportResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_PROJECT, options),

  // Secure encrypted storage
  secureStorageSet: (key: string, value: string) => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_ENCRYPT_SET, key, value),
  secureStorageGet: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_ENCRYPT_GET, key),
  secureStorageRemove: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_ENCRYPT_REMOVE, key),

  // Memory monitoring
  getMemoryUsage: () => ipcRenderer.invoke(IPC_CHANNELS.MONITOR_MEMORY_USAGE)
}

contextBridge.exposeInMainWorld('aiscribe', api)
