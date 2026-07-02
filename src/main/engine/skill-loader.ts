import fs from 'fs'
import path from 'path'
import YAML from 'yaml'
import type { SkillDefinition } from '../../shared/types'
import type { ILLMProvider } from '../di/service-interfaces'
import { logger } from '../utils/logger'

export interface SkillRecord extends SkillDefinition {
  directory: string
  filePath: string
  rawContent: string
}

export interface SkillInput {
  prompt: string
  context?: Record<string, unknown>
  parameters?: Record<string, unknown>
}

export interface SkillResult {
  skillName: string
  output: string
  metadata?: Record<string, unknown>
}

export class SkillLoader {
  private skills: Map<string, SkillRecord> = new Map()
  private loaded = false
  private llmProvider: ILLMProvider

  constructor(llmProvider: ILLMProvider) {
    this.llmProvider = llmProvider
  }

  /** Auto-load all SKILL.md files on first use */
  private ensureLoaded(): void {
    if (this.loaded) return
    // In dev:  __dirname = out/main/ → ../../skills → D:\...\AIscribe\skills
    // In prod: __dirname = app.asar/dist → ../../skills → app root skills/
    const paths = [path.join(__dirname, '../../skills'), path.join(__dirname, '../skills')]
    for (const skillsDir of paths) {
      if (fs.existsSync(skillsDir)) {
        this.loadFromDirectorySync(skillsDir)
        this.loaded = true
        return
      }
    }
    this.loaded = true
    logger.error(`Failed to locate skills directory. Tried: ${paths.join(', ')}`)
  }

  /** Synchronous version for constructor use */
  private loadFromDirectorySync(dirPath: string): SkillRecord[] {
    if (!fs.existsSync(dirPath)) return []
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true })
    } catch (err) {
      logger.error(`Failed to read skills directory: ${dirPath}`, err)
      return []
    }
    const loaded: SkillRecord[] = []
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const skillDir = path.join(dirPath, entry.name)
      const skillFilePath = path.join(skillDir, 'SKILL.md')
      if (!fs.existsSync(skillFilePath)) continue
      try {
        const rawContent = fs.readFileSync(skillFilePath, 'utf-8')
        const skill = this.parseSkillMd(rawContent, skillDir, skillFilePath)
        if (skill) {
          this.registerSkill(skill)
          loaded.push(skill)
        }
      } catch (err) {
        logger.warn(`Failed to load skill from ${skillFilePath}:`, err)
      }
    }
    return loaded
  }

  /**
   * Load skills from a directory containing skill subdirectories
   * Each subdirectory should contain a SKILL.md file
   */
  async loadFromDirectory(dirPath: string): Promise<SkillRecord[]> {
    if (!fs.existsSync(dirPath)) {
      throw new Error(`技能目录不存在: ${dirPath}`)
    }

    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true })
    } catch (err) {
      throw new Error(`读取技能目录失败: ${dirPath}`)
    }

    const loaded: SkillRecord[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const skillDir = path.join(dirPath, entry.name)
      const skillFilePath = path.join(skillDir, 'SKILL.md')

      if (!fs.existsSync(skillFilePath)) continue

      try {
        const rawContent = fs.readFileSync(skillFilePath, 'utf-8')
        const skill = this.parseSkillMd(rawContent, skillDir, skillFilePath)

        if (skill) {
          this.registerSkill(skill)
          loaded.push(skill)
        }
      } catch (err) {
        logger.warn(`Failed to load skill from ${skillFilePath}:`, err)
      }
    }

    return loaded
  }

  /**
   * Load a single skill from a SKILL.md file path
   */
  loadFromFile(filePath: string): SkillRecord | null {
    if (!fs.existsSync(filePath)) return null

    const rawContent = fs.readFileSync(filePath, 'utf-8')
    const skillDir = path.dirname(filePath)
    const skill = this.parseSkillMd(rawContent, skillDir, filePath)

    if (skill) {
      this.registerSkill(skill)
    }

    return skill
  }

  /**
   * Parse a SKILL.md file content into a SkillRecord
   */
  private parseSkillMd(content: string, directory: string, filePath: string): SkillRecord | null {
    try {
      // Extract YAML frontmatter between --- markers
      const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
      if (!frontmatterMatch) return null

      const frontmatter = YAML.parse(frontmatterMatch[1])
      if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
        logger.warn(`Invalid YAML frontmatter in ${filePath}`)
        return null
      }

      const name = frontmatter.name
      if (typeof name !== 'string' || !name.trim()) {
        logger.warn(`Missing skill name in ${filePath}`)
        return null
      }

      return {
        name: name.trim(),
        description: typeof frontmatter.description === 'string' ? frontmatter.description.trim() : '',
        directory,
        filePath,
        rawContent: content,
        category: this.inferCategory(name.trim())
      }
    } catch (err) {
      logger.warn(`Failed to parse skill from ${filePath}:`, err)
      return null
    }
  }

  /**
   * Register a skill, warning on duplicate names.
   * The first registered skill wins to avoid silent overwrites.
   */
  private registerSkill(skill: SkillRecord): void {
    if (this.skills.has(skill.name)) {
      logger.warn(`Duplicate skill name detected: ${skill.name} (${skill.filePath}). Keeping first registered skill.`)
      return
    }
    this.skills.set(skill.name, skill)
  }

  /**
   * Infer skill category from skill name
   */
  private inferCategory(name: string): SkillRecord['category'] {
    if (name.includes('master') || name.includes('总控')) return 'master'
    if (name.includes('structure') || name.includes('story') || name.includes('结构')) return 'structure'
    if (name.includes('character') || name.includes('角色')) return 'character'
    if (name.includes('world') || name.includes('世界观')) return 'world'
    if (name.includes('workflow') || name.includes('流程')) return 'planning'
    if (name.includes('market') || name.includes('市场') || name.includes('radar')) return 'market'
    if (name.includes('analyzer') || name.includes('分析') || name.includes('拆')) return 'analysis'
    if (name.includes('rewrite') || name.includes('改写') || /\bai\b/i.test(name)) return 'revision'
    if (name.includes('polish') || name.includes('revision') || name.includes('修改')) return 'revision'
    return 'writing'
  }

  /**
   * Get a skill by name
   */
  getSkill(name: string): SkillRecord | undefined {
    this.ensureLoaded()
    return this.skills.get(name)
  }

  /**
   * Get all registered skills
   */
  getRegistry(): SkillRecord[] {
    this.ensureLoaded()
    return Array.from(this.skills.values())
  }

  /**
   * Get all registered skill names
   */
  getSkillNames(): string[] {
    this.ensureLoaded()
    return Array.from(this.skills.keys())
  }

  /**
   * Execute a skill by name, using LLM to process the user's request
   * with the skill's documentation as context.
   */
  /**
   * Strip YAML frontmatter from raw markdown content.
   * Returns the body text without the leading `--- ... ---` block.
   */
  private stripFrontmatter(rawContent: string): string {
    const match = rawContent.match(/^---[\s\S]*?---\n?([\s\S]*)$/)
    return match ? match[1].trimStart() : rawContent
  }

  async executeSkill(name: string, input: SkillInput): Promise<SkillResult> {
    const skill = this.getSkill(name)
    if (!skill) {
      throw new Error(`技能不存在: ${name}`)
    }

    try {
      const bodyContent = this.stripFrontmatter(skill.rawContent)
      const response = await this.llmProvider.chat({
        messages: [{ role: 'user', content: input.prompt }],
        system: `你是一个专业的中国网文创作助手。请使用以下技能文档来指导你的回复：

${bodyContent}

请根据上述技能提供专业、详细的创作建议。回复使用中文。`
      })

      return {
        skillName: name,
        output: response.content,
        metadata: {
          prompt: input.prompt,
          description: skill.description,
          usage: response.usage
        }
      }
    } catch (error) {
      throw new Error(`技能执行失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Clear all loaded skills
   */
  clear(): void {
    this.skills.clear()
  }
}
