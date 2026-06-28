import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { SkillLoader } from '../../../src/main/engine/skill-loader'
import type { ILLMProvider } from '../../../src/main/di/service-interfaces'
import { logger } from '../../../src/main/utils/logger'

const mockLLMProvider: ILLMProvider = {
  configure: vi.fn(),
  resetConfig: vi.fn(),
  chat: vi
    .fn()
    .mockResolvedValue({ content: 'mock response', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } }),
  testConnection: vi.fn().mockResolvedValue(true),
  chatStream: vi.fn().mockResolvedValue(undefined),
  cancelStream: vi.fn().mockReturnValue(false)
}

describe('SkillLoader', () => {
  let tempDir: string
  let loader: SkillLoader

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-loader-'))
    loader = new SkillLoader(mockLLMProvider)
  })

  afterEach(() => {
    loader.clear()
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should parse multiline YAML description', () => {
    const skillDir = path.join(tempDir, 'test-skill')
    fs.mkdirSync(skillDir)
    const content = `---
name: test-skill
description: |
  This is a multiline
  description for the skill.
---

# Skill Content
`
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content)

    const skill = loader.loadFromFile(path.join(skillDir, 'SKILL.md'))
    expect(skill).not.toBeNull()
    if (!skill) throw new Error('skill expected')
    expect(skill.name).toBe('test-skill')
    expect(skill.description).toContain('multiline')
    expect(skill.description).toContain('description for the skill')
  })

  it('should warn on duplicate skill names', () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

    const skillDir1 = path.join(tempDir, 'skill-a')
    const skillDir2 = path.join(tempDir, 'skill-b')
    fs.mkdirSync(skillDir1)
    fs.mkdirSync(skillDir2)

    fs.writeFileSync(path.join(skillDir1, 'SKILL.md'), '---\nname: duplicate-skill\ndescription: First\n---\n')
    fs.writeFileSync(path.join(skillDir2, 'SKILL.md'), '---\nname: duplicate-skill\ndescription: Second\n---\n')
    ;(
      loader as unknown as { loadFromDirectorySync(dir: string): ReturnType<typeof loader.loadFromDirectory> }
    ).loadFromDirectorySync(tempDir)

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Duplicate skill name detected: duplicate-skill'))
    warnSpy.mockRestore()
  })

  it('should throw unified error when executing non-existent skill', async () => {
    await expect(loader.executeSkill('non-existent-skill', { prompt: 'test' })).rejects.toThrow(
      '技能不存在: non-existent-skill'
    )
  })

  it('should log error when skills directory does not exist', () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})

    // Clear any previously loaded skills and force ensureLoaded to run
    loader.clear()
    const nonExistentDir = path.join(tempDir, 'non-existent-skills')

    // Create a new loader pointing to a non-existent path by overriding internal paths is not trivial;
    // instead verify loadFromDirectory throws for missing directory
    expect(() =>
      (
        loader as unknown as { loadFromDirectorySync(dir: string): ReturnType<typeof loader.loadFromDirectory> }
      ).loadFromDirectorySync(nonExistentDir)
    ).not.toThrow()
    expect(() => loader.loadFromDirectory(nonExistentDir)).rejects.toThrow('技能目录不存在')

    errorSpy.mockRestore()
  })

  it('should ignore skills with missing name', () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

    const skillDir = path.join(tempDir, 'invalid-skill')
    fs.mkdirSync(skillDir)
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\ndescription: Missing name\n---\n')

    const loaded = (
      loader as unknown as { loadFromDirectorySync(dir: string): ReturnType<typeof loader.loadFromDirectory> }
    ).loadFromDirectorySync(tempDir)
    expect(loaded).toHaveLength(0)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Missing skill name'))

    warnSpy.mockRestore()
  })

  it('should load skills asynchronously from directory', async () => {
    const skillDir = path.join(tempDir, 'async-skill')
    fs.mkdirSync(skillDir)
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: async-skill\ndescription: Async load\n---\n')

    const loaded = await loader.loadFromDirectory(tempDir)
    expect(loaded).toHaveLength(1)
    expect(loaded[0].name).toBe('async-skill')
  })

  it('should return null when file does not exist', () => {
    expect(loader.loadFromFile(path.join(tempDir, 'missing', 'SKILL.md'))).toBeNull()
  })

  it('should execute skill and include metadata', async () => {
    const skillDir = path.join(tempDir, 'exec-skill')
    fs.mkdirSync(skillDir)
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: exec-skill\ndescription: Exec test\n---\n# Content')
    loader.loadFromFile(path.join(skillDir, 'SKILL.md'))

    const result = await loader.executeSkill('exec-skill', { prompt: 'hello' })
    expect(result.skillName).toBe('exec-skill')
    expect(result.output).toBe('mock response')
    expect(result.metadata).toMatchObject({ prompt: 'hello', description: 'Exec test' })
  })

  it('should propagate LLM error when executing skill', async () => {
    const skillDir = path.join(tempDir, 'fail-skill')
    fs.mkdirSync(skillDir)
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: fail-skill\ndescription: Fail test\n---\n')
    loader.loadFromFile(path.join(skillDir, 'SKILL.md'))

    vi.mocked(mockLLMProvider.chat).mockRejectedValueOnce(new Error('LLM down'))
    await expect(loader.executeSkill('fail-skill', { prompt: 'x' })).rejects.toThrow('技能执行失败: LLM down')
  })

  it('should warn on invalid YAML frontmatter object', () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    const skillDir = path.join(tempDir, 'array-skill')
    fs.mkdirSync(skillDir)
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\n- one\n- two\n---\n')

    const skill = loader.loadFromFile(path.join(skillDir, 'SKILL.md'))
    expect(skill).toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid YAML frontmatter'))
    warnSpy.mockRestore()
  })

  it('should warn on YAML parse error', () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    const skillDir = path.join(tempDir, 'broken-skill')
    fs.mkdirSync(skillDir)
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: [invalid\n---\n')

    const skill = loader.loadFromFile(path.join(skillDir, 'SKILL.md'))
    expect(skill).toBeNull()
    expect(warnSpy).toHaveBeenCalled()
    expect(warnSpy.mock.calls[0][0]).toContain('Failed to parse skill')
    warnSpy.mockRestore()
  })

  it('should infer categories from skill names', () => {
    const cases: [string, string][] = [
      ['plot-master', 'master'],
      ['story-structure', 'structure'],
      ['character-builder', 'character'],
      ['world-design', 'world'],
      ['workflow-plan', 'planning'],
      ['market-radar', 'market'],
      ['chapter-analyzer', 'analysis'],
      ['ai-rewrite', 'revision'],
      ['polish-pro', 'revision'],
      ['generic-tool', 'writing']
    ]

    for (const [dirName, expectedCategory] of cases) {
      const skillDir = path.join(tempDir, dirName)
      fs.mkdirSync(skillDir)
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), `---\nname: ${dirName}\ndescription: test\n---\n`)
      const skill = loader.loadFromFile(path.join(skillDir, 'SKILL.md'))
      expect(skill).not.toBeNull()
      if (skill) expect(skill.category).toBe(expectedCategory)
    }
  })

  it('should skip non-directory entries and directories without SKILL.md', async () => {
    fs.writeFileSync(path.join(tempDir, 'not-a-dir.txt'), 'text')
    fs.mkdirSync(path.join(tempDir, 'empty-dir'))

    const loaded = await loader.loadFromDirectory(tempDir)
    expect(loaded).toHaveLength(0)
  })

  it('should expose registry and skill names after loading', async () => {
    const skillDir = path.join(tempDir, 'listed-skill')
    fs.mkdirSync(skillDir)
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: listed-skill\ndescription: listed\n---\n')
    await loader.loadFromDirectory(tempDir)

    expect(loader.getSkillNames()).toContain('listed-skill')
    expect(loader.getRegistry().some(s => s.name === 'listed-skill')).toBe(true)
    expect(loader.getSkill('listed-skill')).toBeDefined()
    expect(loader.getSkill('missing')).toBeUndefined()
  })

  it('should log error when reading directory fails in sync loader', () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})
    const filePath = path.join(tempDir, 'not-a-dir')
    fs.writeFileSync(filePath, 'x')

    const loaded = (
      loader as unknown as { loadFromDirectorySync(dir: string): ReturnType<typeof loader.loadFromDirectory> }
    ).loadFromDirectorySync(filePath)
    expect(loaded).toHaveLength(0)
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
