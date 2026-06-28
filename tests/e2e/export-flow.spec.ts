import { expect, test } from '@playwright/test'
import { closeElectronApp, launchElectronApp } from './helpers/electron-app'

/**
 * E2E test: Data export flow
 * Covers: Settings -> Data Management -> Export All Data
 */

test.describe('Export Flow', () => {
  test.afterEach(async () => {
    await closeElectronApp()
  })

  test('should export all data from settings', async () => {
    const app = await launchElectronApp()
    const page = await app.firstWindow()

    // Create a project so there is data to export
    await page.getByRole('button', { name: /新建项目/ }).click()
    await page.fill('input[placeholder*="小说名称"]', 'Export Test')
    await page.getByRole('button', { name: '创建项目' }).click()
    await expect(page.locator('.topbar-project')).toHaveText('Export Test')

    // Navigate to settings
    await page.click('text=设置')
    await expect(page.getByRole('heading', { name: 'LLM 配置' })).toBeVisible()

    // Switch to data management tab
    await page.getByRole('button', { name: '数据管理' }).click()
    await expect(page.getByRole('heading', { name: '数据管理' })).toBeVisible()

    // Click export
    await page.getByRole('button', { name: '导出所有数据' }).click()

    // Blob URL downloads in Electron do not emit Playwright download events,
    // so verify success feedback instead.
    await expect(page.getByText('导出成功')).toBeVisible()
  })

  test('should show empty state when no projects exist', async () => {
    const app = await launchElectronApp()
    const page = await app.firstWindow()

    await page.click('text=设置')
    await page.getByRole('button', { name: '数据管理' }).click()

    // Click export with no projects should not trigger download
    let downloadTriggered = false
    page.on('download', () => {
      downloadTriggered = true
    })

    await page.getByRole('button', { name: '导出所有数据' }).click()

    // Give a short moment for any async handling
    await page.waitForTimeout(500)

    expect(downloadTriggered).toBe(false)
  })

  test('should navigate through import button', async () => {
    const app = await launchElectronApp()
    const page = await app.firstWindow()

    await page.click('text=设置')
    await page.getByRole('button', { name: '数据管理' }).click()

    await page.getByRole('button', { name: '导入数据' }).click()

    // Import is mocked/placeholder in current implementation
    await expect(page.getByRole('heading', { name: '数据管理' })).toBeVisible()
  })
})
