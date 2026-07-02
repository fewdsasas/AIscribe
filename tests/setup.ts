// AIscribe Test Setup
import '@testing-library/jest-dom/vitest'

export function testId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// Mock localStorage for jsdom environment
const mockStorage: Record<string, string> = {}
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => {
      mockStorage[key] = value
    },
    removeItem: (key: string) => {
      delete mockStorage[key]
    },
    clear: () => {
      Object.keys(mockStorage).forEach(k => delete mockStorage[k])
    }
  },
  writable: true
})

// Mock crypto.randomUUID for tests
Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: () => `mock-uuid-${Math.random().toString(36).substring(2, 9)}`
  },
  writable: true
})

// Mock window.aiscribe for renderer tests
Object.defineProperty(window, 'aiscribe', {
  value: {
    projectList: () => Promise.resolve([]),
    projectDashboardStats: () => Promise.resolve([]),
    projectGet: () => Promise.resolve(null),
    projectCreate: () => Promise.resolve({ id: 'mock-id' }),
    projectUpdate: () => Promise.resolve(true),
    projectDelete: () => Promise.resolve(true),
    secureStorageSet: () => Promise.resolve(true),
    secureStorageGet: () => Promise.resolve(null),
    secureStorageRemove: () => Promise.resolve(true),
    llmIsConfigured: () => Promise.resolve(false),
    onRepairProgress: () => {},
    onRepairDone: () => {},
    removeRepairListeners: () => {},
    triggerAiRepair: () => Promise.resolve({ applied: false, actionsCount: 0, actions: [] })
  },
  writable: true,
  configurable: true
})
