import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

/**
 * Group runtime dependencies and heavy views into dedicated chunks.
 * - vendor-tiptap: TipTap/ProseMirror editor runtime (only needed by editor).
 * - editor-core: custom editor components.
 * - vendor-react: React ecosystem shared by all views.
 * - view-*: individual heavyweight views to keep the main bundle small.
 */
function rendererManualChunks(id: string): string | undefined {
  if (
    id.includes('node_modules/@tiptap/') ||
    id.includes('node_modules/prosemirror-') ||
    id.includes('node_modules/tippy.js/') ||
    id.includes('node_modules/@popperjs/') ||
    id.includes('node_modules/orderedmap/') ||
    id.includes('node_modules/rope-sequence/') ||
    id.includes('node_modules/w3c-keyname/')
  ) {
    return 'vendor-tiptap'
  }
  if (id.includes('src/renderer/components/editor/')) {
    return 'editor-core'
  }
  if (
    id.includes('node_modules/react/') ||
    id.includes('node_modules/react-dom/') ||
    id.includes('node_modules/@heroicons/') ||
    id.includes('node_modules/lucide-react/')
  ) {
    return 'vendor-react'
  }
  if (id.includes('src/renderer/views/StudioView')) return 'view-studio'
  if (id.includes('src/renderer/views/WorkshopView')) return 'view-workshop'
  if (id.includes('src/renderer/components/ai-chat/')) {
    return 'view-ai-chat'
  }
  if (id.includes('src/renderer/views/ReaderView')) return 'view-reader'
  if (id.includes('src/renderer/views/SettingsView')) return 'view-settings'
  return undefined
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
        '@main': resolve('src/main')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
        '@renderer': resolve('src/renderer')
      }
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: rendererManualChunks
        }
      }
    },
    plugins: [
      react(),
      visualizer({
        filename: './out/renderer-bundle-stats.html',
        title: 'AIscribe Renderer Bundle',
        open: false,
        gzipSize: true,
        brotliSize: true
      })
    ]
  }
})
