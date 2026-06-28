import { expect, test } from '@playwright/test'
import { closeElectronApp, launchElectronApp } from './helpers/electron-app'

/**
 * E2E test: LLM provider switching and custom protocol selection
 * Covers: Settings -> LLM Config -> Provider switch, protocol switch
 */

test.describe('LLM Provider & Protocol Flow', () => {
  test.afterEach(async () => {
    await closeElectronApp()
  })

  test('should switch provider and update defaults', async () => {
    const app = await launchElectronApp()
    const page = await app.firstWindow()

    // Navigate to settings
    await page.click('text=设置')
    await expect(page.getByRole('heading', { name: 'LLM 配置' })).toBeVisible()

    // Switch to Anthropic provider
    await page.getByRole('button', { name: 'Anthropic Claude' }).click()

    // Verify defaults updated
    await expect(page.locator('input[placeholder*="messages"]')).toHaveValue('https://api.anthropic.com/v1/messages')
    await expect(page.locator('input[placeholder*="claude"]')).toHaveValue('claude-sonnet-4-20250514')
  })

  test('should switch custom protocol between OpenAI and Anthropic', async () => {
    const app = await launchElectronApp()
    const page = await app.firstWindow()

    await page.click('text=设置')
    await expect(page.getByRole('heading', { name: 'LLM 配置' })).toBeVisible()

    // Select custom provider
    await page.getByRole('button', { name: /自定义/ }).click()

    // Protocol selector should appear
    await expect(page.getByText('接口协议')).toBeVisible()

    // Select OpenAI compatible protocol
    await page.getByRole('button', { name: 'OpenAI 兼容协议' }).click()
    await expect(page.locator('input[placeholder*="chat/completions"]')).toHaveValue('')

    // Select Anthropic protocol
    await page.getByRole('button', { name: 'Anthropic 协议' }).click()
    await expect(page.locator('input[placeholder*="chat/completions"]')).toHaveValue('')
  })

  test('should save provider config and persist after reload', async () => {
    const app = await launchElectronApp()
    const page = await app.firstWindow()

    await page.click('text=设置')
    await expect(page.getByRole('heading', { name: 'LLM 配置' })).toBeVisible()

    await page.getByRole('button', { name: 'OpenAI' }).click()
    await page.fill('input[placeholder*="https://"] >> nth=0', 'https://api.openai.com/v1/chat/completions')
    await page.fill('input[placeholder*="gpt-4o"]', 'gpt-4o-test')
    await page.fill('input[placeholder*="sk-"]', 'sk-test-key')

    await page.getByRole('button', { name: '保存配置' }).click()

    await expect(page.getByText('✓ 已保存')).toBeVisible()

    // Reload and verify persistence
    await page.reload()
    await page.click('text=设置')
    await expect(page.getByRole('heading', { name: 'LLM 配置' })).toBeVisible()

    await expect(page.locator('input[placeholder*="https://"] >> nth=0')).toHaveValue(
      'https://api.openai.com/v1/chat/completions'
    )
    await expect(page.locator('input[placeholder*="gpt-4o"]')).toHaveValue('gpt-4o-test')
  })
})
