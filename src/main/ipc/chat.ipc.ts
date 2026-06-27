import type { IpcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types/ipc'
import { LLM_PROVIDER_TOKEN, requireObject, sanitizeError, wrap, wrapEvent } from './index'
import type { ServiceRegistry } from '../di'
import type { ILLMProvider } from '../di'
import type { LLMRequest } from '../../shared/types'

export function registerChatHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  const llm = services.resolve<ILLMProvider>(LLM_PROVIDER_TOKEN)

  ipcMain.handle(
    IPC_CHANNELS.LLM_CHAT,
    wrap(async (request: LLMRequest) => {
      requireObject(request, 'LLM 请求')
      if (!request.messages?.length) throw new Error('对话消息不能为空')
      return llm.chat(request)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.LLM_CHAT_STREAM,
    wrapEvent(async (event, request: LLMRequest) => {
      requireObject(request, 'LLM 请求')
      if (!request.messages?.length) throw new Error('对话消息不能为空')
      if (!Array.isArray(request.messages)) throw new Error('messages 必须是数组')
      for (const msg of request.messages) {
        if (typeof msg.role !== 'string' || typeof msg.content !== 'string') {
          throw new Error('每条消息必须包含 role 和 content 字符串')
        }
      }
      const sender = event.sender
      await llm.chatStream(
        request,
        {
          onChunk: (text: string) => {
            if (!sender.isDestroyed()) sender.send(IPC_CHANNELS.LLM_CHUNK, { text })
          },
          onDone: usage => {
            if (!sender.isDestroyed()) sender.send(IPC_CHANNELS.LLM_DONE, { usage })
          },
          onError: (message: string) => {
            const sanitized = sanitizeError(message)
            if (!sender.isDestroyed()) sender.send(IPC_CHANNELS.LLM_ERROR, { message: sanitized })
          }
        },
        undefined,
        request.requestId
      )
      return true
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.LLM_CANCEL_STREAM,
    wrap((requestId: string) => {
      if (typeof requestId !== 'string' || !requestId) {
        throw new Error('requestId 不能为空')
      }
      return llm.cancelStream(requestId)
    })
  )
}
