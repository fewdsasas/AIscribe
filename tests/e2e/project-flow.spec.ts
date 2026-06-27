import { expect, test } from '@playwright/test'

/**
 * E2E test: Core project creation flow
 * Covers: Dashboard -> Create Project -> Editor View
 */

test.describe('Project Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app (dev server URL)
    await page.goto('http://localhost:5173')
  })

  test('should display dashboard with empty state', async ({ page }) => {
    await expect(page.locator('text=还没有创作项目')).toBeVisible()
    await expect(page.locator('text=+ 新建项目')).toBeVisible()
  })

  test('should create a new project and navigate to editor', async ({ page }) => {
    // Click "New Project" button
    await page.click('text=+ 新建项目')

    // Fill project dialog
    await page.fill('input[placeholder*="小说名称"]', 'Test Novel')
    await page.fill('textarea[placeholder*="描述"]', 'A test project for E2E')

    // Submit
    await page.click('text=创建项目')

    // Should navigate to editor
    await expect(page.locator('text=Test Novel')).toBeVisible({ timeout: 5000 })
  })

  test('should display project stats after creation', async ({ page }) => {
    // Create a project first
    await page.click('text=+ 新建项目')
    await page.fill('input[placeholder*="小说名称"]', 'Stats Test')
    await page.click('text=创建项目')

    // Go back to dashboard
    await page.click('text=Dashboard')

    // Verify stats are displayed
    await expect(page.locator('text=Stats Test')).toBeVisible()
    await expect(page.locator('text=项目数')).toBeVisible()
  })
})
