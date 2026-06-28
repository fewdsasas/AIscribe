import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc'
import { createDefaultServiceRegistry, type ServiceRegistry } from './di'
import { logger } from './utils/logger'
import { DEFAULT_ENDPOINTS } from '../shared/constants'

let mainWindow: BrowserWindow | null = null
let services: ServiceRegistry | null = null

/** Extract host origin from a full URL */
function getOrigin(url: string): string {
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.host}`
  } catch {
    return ''
  }
}

/** Build dynamic CSP string from known LLM endpoints */
function buildCsp(): string {
  // In dev mode, Vite/React Fast Refresh injects inline scripts; allow them only locally
  const scriptSrc = is.dev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self'"
  const baseCsp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "frame-src 'none'",
    "object-src 'none'"
  ]

  // Extract unique origins from LLM endpoints
  const origins = new Set<string>(["'self'"])
  for (const endpoint of Object.values(DEFAULT_ENDPOINTS) as string[]) {
    const origin = getOrigin(endpoint)
    if (origin) origins.add(origin)
  }
  // Vite dev server requires ws: for HMR
  if (is.dev) {
    origins.add('http://localhost:5173')
    origins.add('ws://localhost:5173')
  }
  baseCsp.push(`connect-src ${Array.from(origins).join(' ')}`)

  return baseCsp.join('; ') + ';'
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    title: 'AIscribe',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // sandbox enabled: contextBridge and ipcRenderer work fine inside sandbox,
      // no Node.js APIs are needed directly in the renderer process
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  })

  // CSP: prevent XSS and unauthorized resource loading
  const cspString = buildCsp()
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [cspString]
      }
    })
  })

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && !url.startsWith('http://localhost')) {
      event.preventDefault()
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    if (is.dev && process.env.NODE_ENV !== 'test') {
      mainWindow?.webContents.openDevTools()
    }
  })

  // Capture renderer console logs / errors in main process for easier diagnosis
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levelName = ['debug', 'log', 'warn', 'error'][level] ?? 'log'
    logger.log(`[renderer:${levelName}] ${sourceId}:${line} ${message}`)
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logger.error('Renderer process crashed:', details)
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    logger.error(`Renderer failed to load: ${errorCode} ${errorDescription}`)
  })

  mainWindow.webContents.setWindowOpenHandler(details => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // In dev mode, load from vite dev server; in production, load the built HTML
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app
  .whenReady()
  .then(async () => {
    electronApp.setAppUserModelId('com.aiscribe.app')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    // Create the service registry and register IPC handlers
    services = await createDefaultServiceRegistry()
    registerIpcHandlers(ipcMain, services)

    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })
  .catch(err => {
    logger.error('App initialization failed:', err)
    app.quit()
  })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  if (services) {
    try {
      await services.close()
    } catch (e) {
      logger.error('Failed to close service registry:', e)
    }
    services = null
  }
})
