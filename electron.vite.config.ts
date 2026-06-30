import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

/**
 * Group TipTap/ProseMirror editor dependencies and the custom editor components
 * into a dedicated chunk. This prevents the default Vite splitter from placing
 * the entire editor runtime into unrelated chunks (e.g. useMemoryMonitor).
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
