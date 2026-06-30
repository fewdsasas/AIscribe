import crypto from 'crypto'
import type { IpcMain } from 'electron'
import { DATABASE_TOKEN, requireEnum, requireId, requireNonNegativeNumber, requireObject, wrap } from './index'
import type { ServiceRegistry } from '../di'
import type { IDatabase } from '../di'
import { ExportEngine, type ExportFormat } from '../export'
import { chunkString, estimatePayloadSize, LARGE_PAYLOAD_THRESHOLD } from '../../shared/utils/ipc-payload'
import { logger } from '../utils/logger'

interface ChunkedExportSession {
  filename: string
  chunks: string[]
  createdAt: number
}

const CHUNK_TTL_MS = 5 * 60 * 1000
const chunkedExports = new Map<string, ChunkedExportSession>()

function cleanupExpiredChunks(): void {
  const now = Date.now()
  for (const [id, session] of chunkedExports) {
    if (now - session.createdAt > CHUNK_TTL_MS) {
      chunkedExports.delete(id)
    }
  }
}

function storeChunkedExport(filename: string, chunks: string[]): string {
  cleanupExpiredChunks()
  const chunkId = crypto.randomUUID()
  chunkedExports.set(chunkId, { filename, chunks, createdAt: Date.now() })
  return chunkId
}

export function registerExportHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  ipcMain.handle(
    'export:project',
    wrap(async (options: { projectId: string; format: ExportFormat; includeSynopsis?: boolean }) => {
      requireObject(options, '导出选项')
      requireId(options.projectId, '项目ID')
      requireEnum(options.format, ['txt', 'markdown', 'html'], '导出格式')
      const d = await services.resolveAsync<IDatabase>(DATABASE_TOKEN)
      const ex = new ExportEngine(d)
      const result = await ex.exportProject(options)
      const payloadSize = estimatePayloadSize(result.content)
      if (payloadSize > LARGE_PAYLOAD_THRESHOLD) {
        logger.info(`[export:project] chunking large export: ${payloadSize} bytes`)
        const chunks = chunkString(result.content)
        const chunkId = storeChunkedExport(result.filename, chunks)
        return { chunked: true, chunkId, totalChunks: chunks.length, filename: result.filename }
      }
      return { chunked: false, content: result.content, filename: result.filename }
    })
  )

  ipcMain.handle(
    'export:project:chunk',
    wrap((request: { chunkId: string; index: number }) => {
      requireObject(request, '分块请求')
      requireId(request.chunkId, '分块ID')
      requireNonNegativeNumber(request.index, '分块索引')
      cleanupExpiredChunks()
      const session = chunkedExports.get(request.chunkId)
      if (!session) throw new Error('分块会话不存在或已过期')
      if (request.index >= session.chunks.length) throw new Error('分块索引越界')
      return { index: request.index, data: session.chunks[request.index] }
    })
  )
}
