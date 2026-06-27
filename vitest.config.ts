import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/main/**/*.ts', 'src/shared/**/*.ts', 'src/renderer/**/*.ts', 'src/renderer/**/*.tsx'],
      exclude: ['node_modules', 'dist', 'tests'],
      thresholds: {
        statements: 60,
        branches: 53,
        functions: 58,
        lines: 61
      }
    },
    setupFiles: ['./tests/setup.ts']
  },
  resolve: {
    alias: {
      '@shared': resolve('src/shared'),
      '@main': resolve('src/main'),
      '@renderer': resolve('src/renderer')
    }
  }
})
