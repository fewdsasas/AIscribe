// Shared constants for the application

/** Debounce delay for database saves (ms) */
export const DB_SAVE_DEBOUNCE_MS = 300

/** Debounce delay for chat localStorage saves (ms) */
export const CHAT_SAVE_DEBOUNCE_MS = 500

/** Maximum length for validated strings */
export const MAX_STRING_LENGTH = 100000

/** Default LLM stream timeout (ms) */
export const LLM_STREAM_TIMEOUT_MS = 120_000

/** Renderer-side LLM stream timeout (ms) */
export const RENDERER_STREAM_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

/** Simulation delay per character for mock LLM responses (ms) */
export const SIMULATED_STREAM_BASE_DELAY_MS = 15
export const SIMULATED_STREAM_MAX_EXTRA_DELAY_MS = 25

export const DEFAULT_ENDPOINTS: Record<string, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  claude: 'https://api.anthropic.com/v1/messages',
  mimo: 'https://api.mimo.ai/v1/chat/completions',
  wenxin: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat',
  tongyi: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
}

export const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o',
  claude: 'claude-sonnet-4-20250514',
  mimo: 'mimo-7b',
  wenxin: 'ernie-bot-4',
  tongyi: 'qwen-max'
}
