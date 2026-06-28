import type { IpcMain } from 'electron'
import { LLM_PROVIDER_TOKEN, requireEnum, requireObject, sanitizeError, wrap, wrapEvent } from './index'
import type { ServiceRegistry } from '../di'
import type { ILLMProvider } from '../di'
import type { LLMRequest } from '../../shared/types'

export function registerChatHandlers(ipcMain: IpcMain, services: ServiceRegistry): void {
  const llm = services.resolve<ILLMProvider>(LLM_PROVIDER_TOKEN)

  ipcMain.handle(
    'llm:chat',
    wrap(async (request: LLMRequest) => {
      requireObject(request, 'LLM 请求')
      if (!request.messages?.length) throw new Error('对话消息不能为空')
      for (const msg of request.messages) {
        requireEnum(msg.role, ['system', 'user', 'assistant'], '消息角色')
      }
      return llm.chat(request)
    })
  )

  ipcMain.handle(
    'llm:chat-stream',
    wrapEvent(async (event, request: LLMRequest) => {
      requireObject(request, 'LLM 请求')
      if (!request.messages?.length) throw new Error('对话消息不能为空')
      if (!Array.isArray(request.messages)) throw new Error('messages 必须是数组')
      for (const msg of request.messages) {
        if (typeof msg.role !== 'string' || typeof msg.content !== 'string') {
          throw new Error('每条消息必须包含 role 和 content 字符串')
        }
        requireEnum(msg.role, ['system', 'user', 'assistant'], '消息角色')
      }
      const sender = event.sender
      await llm.chatStream(
        request,
        {
          onChunk: (text: string) => {
            if (!sender.isDestroyed()) sender.send('llm:chunk', { text })
          },
          onDone: usage => {
            if (!sender.isDestroyed()) sender.send('llm:done', { usage })
          },
          onError: (message: string) => {
            const sanitized = sanitizeError(message)
            if (!sender.isDestroyed()) sender.send('llm:error', { message: sanitized })
          }
        },
        undefined,
        request.requestId
      )
      return true
    })
  )

  ipcMain.handle(
    'llm:cancel-stream',
    wrap((requestId: string) => {
      if (typeof requestId !== 'string' || !requestId) {
        throw new Error('requestId 不能为空')
      }
      return llm.cancelStream(requestId)
    })
  )
}
