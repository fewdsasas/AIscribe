import { expect, test } from '@playwright/test'
import { closeElectronApp, launchElectronApp } from './helpers/electron-app'

/**
 * E2E test: Novel and chapter editing flow
 * Covers: Editor -> Default chapter -> Edit Content
 */

test.describe('Novel & Chapter Flow', () => {
  test.afterEach(async () => {
    await closeElectronApp()
  })

  test('should create a project with a default chapter', async () => {
    const app = await launchElectronApp()
    const page = await app.firstWindow()

    // Create project
    await page.getByRole('button', { name: /新建项目/ }).click()
    await page.fill('input[placeholder*="小说名称"]', 'Chapter Test')
    await page.getByRole('button', { name: '创建项目' }).click()

    // Editor should load with a default chapter
    await expect(page.locator('.topbar-project')).toHaveText('Chapter Test')
    await expect(page.getByRole('combobox')).toBeVisible()
    await expect(page.getByRole('heading', { name: '第一章' })).toBeVisible()
  })

  test('should edit chapter content', async () => {
    const app = await launchElectronApp()
    const page = await app.firstWindow()

    // Create project
    await page.getByRole('button', { name: /新建项目/ }).click()
    await page.fill('input[placeholder*="小说名称"]', 'Edit Test')
    await page.getByRole('button', { name: '创建项目' }).click()

    // Wait for editor to load
    await expect(page.locator('.topbar-project')).toHaveText('Edit Test')

    // Type in editor
    await page.fill('[contenteditable="true"]', 'Once upon a time...')

    // Content should persist in the DOM
    await expect(page.locator('text=Once upon a time...')).toBeVisible()
  })
})
