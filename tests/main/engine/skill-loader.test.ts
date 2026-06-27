import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: () => '/mock/userData' }
}))

import { SkillLoader } from '../../../src/main/engine/skill-loader'
import { LLMProvider } from '../../../src/main/engine/llm-provider'
import type { ILLMProvider } from '../../../src/main/di/service-interfaces'
import path from 'path'
import fs from 'fs'

function writeSkillFile(dir: string, name: string, description = '测试技能'): string {
  fs.mkdirSync(dir, { recursive: true })
  const filePath = path.join(dir, 'SKILL.md')
  fs.writeFileSync(filePath, `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\n测试内容\n`)
  return filePath
}

let provider: ILLMProvider

describe('SkillLoader', () => {
  const testSkillsDir = path.join(__dirname, '../../fixtures/skills')
  let loader: SkillLoader

  beforeAll(() => {
    provider = new LLMProvider()
    // Create test skill files
    const skillDir = path.join(testSkillsDir, 'test-story-structure')
    fs.mkdirSync(skillDir, { recursive: true })

    fs.writeFileSync(
      path.join(skillDir, 'SKILL.md'),
      `---
name: test-story-structure
description: 测试故事结构技能 - 用于测试技能加载器
---

# 测试故事结构

这是一个测试用的故事结构技能。
`
    )

    const skillDir2 = path.join(testSkillsDir, 'test-character-creation')
    fs.mkdirSync(skillDir2, { recursive: true })

    fs.writeFileSync(
      path.join(skillDir2, 'SKILL.md'),
      `---
name: test-character-creation
description: 测试角色创建技能
---

# 测试角色创建

这是一个测试用的角色创建技能。
`
    )

    // Create an invalid skill directory (no SKILL.md)
    const invalidDir = path.join(testSkillsDir, 'invalid-skill')
    fs.mkdirSync(invalidDir, { recursive: true })

    loader = new SkillLoader(provider)
  })

  afterAll(() => {
    fs.rmSync(testSkillsDir, { recursive: true, force: true })
  })

  describe('loading skills', () => {
    it('should load skills from a directory', async () => {
      const skills = await loader.loadFromDirectory(testSkillsDir)
      expect(skills.length).toBe(2)
    })

    it('should parse skill name and description from SKILL.md', () => {
      const skills = loader.getRegistry()
      const storySkill = skills.find(s => s.name === 'test-story-structure')
      expect(storySkill).toBeDefined()
      if (!storySkill) throw new Error('storySkill not found')
      expect(storySkill.description).toContain('故事结构')
    })
  })

  describe('skill registry', () => {
    it('should find a skill by name', () => {
      const skill = loader.getSkill('test-character-creation')
      expect(skill).toBeDefined()
      if (!skill) throw new Error('skill not found')
      expect(skill.name).toBe('test-character-creation')
    })

    it('should return undefined for unknown skill', () => {
      const skill = loader.getSkill('non-existent')
      expect(skill).toBeUndefined()
    })

    it('should list all registered skill names', () => {
      const names = loader.getSkillNames()
      expect(names).toContain('test-story-structure')
      expect(names).toContain('test-character-creation')
    })
  })

  describe('skill execution', () => {
    it('should execute a skill and return a result', async () => {
      // Configure the provider instance injected into the loader
      provider.configure({
        provider: 'openai',
        apiKey: 'sk-test-key',
        model: 'gpt-4o'
      })
      // Mock fetch to avoid actual API call
      const originalFetch = globalThis.fetch
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: '测试结果' } }] }), { status: 200 })

      try {
        const result = await loader.executeSkill('test-story-structure', {
          prompt: '帮我设计一个三幕剧结构'
        })
        expect(result).toBeDefined()
        expect(result.skillName).toBe('test-story-structure')
        expect(result.output).toBe('测试结果')
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('should throw for unknown skill', async () => {
      await expect(loader.executeSkill('non-existent', { prompt: 'test' })).rejects.toThrow('技能不存在')
    })
  })
})

describe('SkillLoader.inferCategory', () => {
  const tempDir = path.join(__dirname, '../../fixtures/skills-category')
  let loader: SkillLoader

  beforeAll(() => {
    fs.mkdirSync(tempDir, { recursive: true })
  })

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  beforeEach(() => {
    loader = new SkillLoader(provider)
  })

  const cases: Array<{ name: string; category: string }> = [
    { name: 'test-master', category: 'master' },
    { name: 'test-structure', category: 'structure' },
    { name: 'test-character', category: 'character' },
    { name: 'test-world', category: 'world' },
    { name: 'test-workflow', category: 'planning' },
    { name: 'test-market', category: 'market' },
    { name: 'test-analyzer', category: 'analysis' },
    { name: 'test-rewrite', category: 'revision' },
    { name: 'test-unknown', category: 'writing' }
  ]

  it.each(cases)('should infer category $category for skill name $name', ({ name, category }) => {
    const skillDir = path.join(tempDir, name)
    const filePath = writeSkillFile(skillDir, name)
    const skill = loader.loadFromFile(filePath)
    expect(skill).not.toBeNull()
    if (!skill) throw new Error('skill not loaded')
    expect(skill.category).toBe(category)
  })

  it('should infer master for Chinese keyword 总控', () => {
    const skillDir = path.join(tempDir, '总控-skill')
    const filePath = writeSkillFile(skillDir, '总控-skill')
    const skill = loader.loadFromFile(filePath)
    expect(skill).not.toBeNull()
    if (!skill) throw new Error('skill not loaded')
    expect(skill.category).toBe('master')
  })

  it('should infer structure for Chinese keyword 结构', () => {
    const skillDir = path.join(tempDir, '结构-skill')
    const filePath = writeSkillFile(skillDir, '结构-skill')
    const skill = loader.loadFromFile(filePath)
    expect(skill).not.toBeNull()
    if (!skill) throw new Error('skill not loaded')
    expect(skill.category).toBe('structure')
  })

  it('should infer analysis for Chinese keyword 拆', () => {
    const skillDir = path.join(tempDir, '拆书-skill')
    const filePath = writeSkillFile(skillDir, '拆书-skill')
    const skill = loader.loadFromFile(filePath)
    expect(skill).not.toBeNull()
    if (!skill) throw new Error('skill not loaded')
    expect(skill.category).toBe('analysis')
  })

  it('should infer revision for keyword polish', () => {
    const skillDir = path.join(tempDir, 'test-polish')
    const filePath = writeSkillFile(skillDir, 'test-polish')
    const skill = loader.loadFromFile(filePath)
    expect(skill).not.toBeNull()
    if (!skill) throw new Error('skill not loaded')
    expect(skill.category).toBe('revision')
  })

  it('should infer market for keyword radar', () => {
    const skillDir = path.join(tempDir, 'test-radar')
    const filePath = writeSkillFile(skillDir, 'test-radar')
    const skill = loader.loadFromFile(filePath)
    expect(skill).not.toBeNull()
    if (!skill) throw new Error('skill not loaded')
    expect(skill.category).toBe('market')
  })
})

describe('SkillLoader.loadFromFile', () => {
  const tempDir = path.join(__dirname, '../../fixtures/skills-loadfile')

  beforeAll(() => {
    fs.mkdirSync(tempDir, { recursive: true })
  })

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should load a single SKILL.md file directly', () => {
    const loader = new SkillLoader(provider)
    const skillDir = path.join(tempDir, 'single-skill')
    const filePath = writeSkillFile(skillDir, 'single-skill')
    const skill = loader.loadFromFile(filePath)
    expect(skill).not.toBeNull()
    if (!skill) throw new Error('skill not loaded')
    expect(skill.name).toBe('single-skill')
    expect(skill.filePath).toBe(filePath)
    expect(skill.directory).toBe(skillDir)
  })

  it('should return null for non-existent file path', () => {
    const loader = new SkillLoader(provider)
    const result = loader.loadFromFile(path.join(tempDir, 'does-not-exist', 'SKILL.md'))
    expect(result).toBeNull()
  })
})

describe('SkillLoader.parseSkillMd boundaries', () => {
  const tempDir = path.join(__dirname, '../../fixtures/skills-parse')
  let loader: SkillLoader

  beforeAll(() => {
    fs.mkdirSync(tempDir, { recursive: true })
  })

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  beforeEach(() => {
    loader = new SkillLoader(provider)
  })

  it('should return null for file without frontmatter', () => {
    const skillDir = path.join(tempDir, 'no-frontmatter')
    fs.mkdirSync(skillDir, { recursive: true })
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Just a title\n\nNo frontmatter here.\n')
    expect(loader.loadFromFile(path.join(skillDir, 'SKILL.md'))).toBeNull()
  })

  it('should return null when description exists but name is missing', () => {
    const skillDir = path.join(tempDir, 'no-name')
    fs.mkdirSync(skillDir, { recursive: true })
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), `---\ndescription: 有描述但没名字\n---\n\n# No name\n`)
    expect(loader.loadFromFile(path.join(skillDir, 'SKILL.md'))).toBeNull()
  })

  it('should load skill with empty description when description is missing', () => {
    const skillDir = path.join(tempDir, 'no-description')
    fs.mkdirSync(skillDir, { recursive: true })
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), `---\nname: no-description\n---\n\n# No description\n`)
    const skill = loader.loadFromFile(path.join(skillDir, 'SKILL.md'))
    expect(skill).not.toBeNull()
    if (!skill) throw new Error('skill not loaded')
    expect(skill.name).toBe('no-description')
    expect(skill.description).toBe('')
  })
})

describe('SkillLoader.clear', () => {
  const tempDir = path.join(__dirname, '../../fixtures/skills-clear')

  beforeAll(() => {
    fs.mkdirSync(tempDir, { recursive: true })
  })

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should clear all loaded skills', () => {
    const loader = new SkillLoader(provider)
    const skillDir = path.join(tempDir, 'clearable-skill')
    const filePath = writeSkillFile(skillDir, 'clearable-skill')
    loader.loadFromFile(filePath)
    expect(loader.getRegistry().length).toBeGreaterThan(0)

    loader.clear()

    expect(loader.getRegistry()).toHaveLength(0)
    expect(loader.getSkillNames()).toHaveLength(0)
    expect(loader.getSkill('clearable-skill')).toBeUndefined()
  })
})

describe('SkillLoader.executeSkill error path', () => {
  const tempDir = path.join(__dirname, '../../fixtures/skills-execerror')
  let loader: SkillLoader

  beforeAll(() => {
    fs.mkdirSync(tempDir, { recursive: true })
    const skillDir = path.join(tempDir, 'error-skill')
    writeSkillFile(skillDir, 'error-skill')
  })

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  beforeEach(() => {
    loader = new SkillLoader(provider)
    loader.loadFromFile(path.join(tempDir, 'error-skill', 'SKILL.md'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should wrap LLM failures with 技能执行失败 prefix', async () => {
    const mockLLM: ILLMProvider = {
      configure: vi.fn(),
      resetConfig: vi.fn(),
      chat: vi.fn().mockRejectedValue(new Error('API timeout')),
      chatStream: vi.fn(),
      cancelStream: vi.fn()
    }
    loader = new SkillLoader(mockLLM)
    loader.loadFromFile(path.join(tempDir, 'error-skill', 'SKILL.md'))

    await expect(loader.executeSkill('error-skill', { prompt: 'test' })).rejects.toThrow('技能执行失败: API timeout')
  })

  it('should stringify non-Error throw values in error message', async () => {
    const mockLLM: ILLMProvider = {
      configure: vi.fn(),
      resetConfig: vi.fn(),
      chat: vi.fn().mockRejectedValue('string error'),
      chatStream: vi.fn(),
      cancelStream: vi.fn()
    }
    loader = new SkillLoader(mockLLM)
    loader.loadFromFile(path.join(tempDir, 'error-skill', 'SKILL.md'))

    await expect(loader.executeSkill('error-skill', { prompt: 'test' })).rejects.toThrow('技能执行失败: string error')
  })
})
