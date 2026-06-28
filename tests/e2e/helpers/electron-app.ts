import { _electron as electron, type ElectronApplication } from '@playwright/test'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

let app: ElectronApplication | null = null
let userDataDir: string | null = null

/**
 * Launch a fresh AIscribe Electron application instance for E2E tests.
 * Each call creates a new app with an isolated temporary user data directory
 * to prevent state leakage between tests.
 */
export async function launchElectronApp(): Promise<ElectronApplication> {
  await closeElectronApp()

  const mainPath = path.resolve(__dirname, '../../../out/main/index.js')
  userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiscribe-e2e-'))

  app = await electron.launch({
    args: [mainPath, `--user-data-dir=${userDataDir}`],
    env: {
      ...process.env,
      NODE_ENV: 'test'
    }
  })

  return app
}

export async function closeElectronApp(): Promise<void> {
  if (app) {
    await app.close()
    app = null
  }
  if (userDataDir) {
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors on Windows locked files
    }
    userDataDir = null
  }
}
