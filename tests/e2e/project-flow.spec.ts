import { expect, test } from '@playwright/test'
import { closeElectronApp, launchElectronApp } from './helpers/electron-app'

/**
 * E2E test: Core project creation flow
 * Covers: Dashboard -> Create Project -> Editor View
 */

test.describe('Project Flow', () => {
  test.afterEach(async () => {
    await closeElectronApp()
  })

  test('should display dashboard with empty state', async () => {
    const app = await launchElectronApp()
    const page = await app.firstWindow()

    await expect(page.getByRole('heading', { name: /还没有创作项目/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /新建项目/ })).toBeVisible()
  })

  test('should create a new project and navigate to editor', async () => {
    const app = await launchElectronApp()
    const page = await app.firstWindow()

    // Click "New Project" button
    await page.getByRole('button', { name: /新建项目/ }).click()

    // Fill project dialog
    await page.fill('input[placeholder*="小说名称"]', 'Test Novel')
    await page.fill('textarea[placeholder*="描述"]', 'A test project for E2E')

    // Submit
    await page.getByRole('button', { name: '创建项目' }).click()

    // Should navigate to editor
    await expect(page.locator('.topbar-project')).toHaveText('Test Novel')
  })

  test('should display project stats after creation', async () => {
    const app = await launchElectronApp()
    const page = await app.firstWindow()

    // Create a project first
    await page.getByRole('button', { name: /新建项目/ }).click()
    await page.fill('input[placeholder*="小说名称"]', 'Stats Test')
    await page.getByRole('button', { name: '创建项目' }).click()

    // Go back to dashboard
    await page.click('text=项目')

    // Verify stats are displayed
    await expect(page.getByRole('main').getByText('Stats Test')).toBeVisible()
    await expect(page.getByText('项目数')).toBeVisible()
  })
})
