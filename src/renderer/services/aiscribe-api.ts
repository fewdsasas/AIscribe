import type { AiscribeAPI } from '@shared/types/electron'

export function getAiscribe(): AiscribeAPI | undefined {
  return window.aiscribe
}
