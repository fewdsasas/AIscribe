import { expect, test } from '@playwright/test'

/**
 * E2E test: Novel and chapter creation flow
 * Covers: Editor -> Create Chapter -> Edit Content
 */

test.describe('Novel & Chapter Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
  })

  test('should create a chapter within a novel', async ({ page }) => {
    // Create project
    await page.click('text=+ 新建项目')
    await page.fill('input[placeholder*="小说名称"]', 'Chapter Test')
    await page.click('text=创建项目')

    // Should be in editor, create a chapter
    await page.click('text=新建章节')
    await page.fill('input[placeholder*="章节标题"]', '第一章')
    await page.click('text=确认')

    // Chapter should appear
    await expect(page.locator('text=第一章')).toBeVisible()
  })

  test('should edit chapter content', async ({ page }) => {
    // Create project with chapter
    await page.click('text=+ 新建项目')
    await page.fill('input[placeholder*="小说名称"]', 'Edit Test')
    await page.click('text=创建项目')

    // Create chapter
    await page.click('text=新建章节')
    await page.fill('input[placeholder*="章节标题"]', 'Prologue')
    await page.click('text=确认')

    // Click on chapter to edit
    await page.click('text=Prologue')

    // Type in editor
    await page.fill('[contenteditable="true"]', 'Once upon a time...')

    // Content should persist
    await expect(page.locator('text=Once upon a time...')).toBeVisible()
  })
})
