import fs from 'fs'
import path from 'path'
import { NovelParseError } from './parser-types'

const ALLOWED_EXTENSIONS = ['.txt', '.epub', '.docx', '.pdf']
const DEFAULT_MAX_SIZE_BYTES = 50 * 1024 * 1024 // 50MB

export interface PathValidationOptions {
  maxSizeBytes?: number
}

function hasTraversalSegment(filePath: string): boolean {
  // 同时处理 Windows 反斜杠与 Unix 正斜杠，避免跨平台路径分隔符绕过
  return filePath.split(/[/\\]/).some(part => part === '..')
}

function isAbsolutePath(filePath: string): boolean {
  return path.isAbsolute(filePath)
}

function hasAllowedExtension(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return ALLOWED_EXTENSIONS.includes(ext)
}

export async function validateImportPath(filePath: string, options: PathValidationOptions = {}): Promise<void> {
  if (!filePath || typeof filePath !== 'string') {
    throw new NovelParseError('文件路径不能为空', 'path_forbidden')
  }

  if (!isAbsolutePath(filePath)) {
    throw new NovelParseError(`只允许绝对路径: ${filePath}`, 'path_forbidden')
  }

  // 必须在 normalize 之前检查遍历片段，normalize 会解析掉 ..
  if (hasTraversalSegment(filePath)) {
    throw new NovelParseError(`路径包含非法的目录遍历片段: ${filePath}`, 'path_forbidden')
  }

  if (!hasAllowedExtension(filePath)) {
    throw new NovelParseError(`不支持的文件格式，只允许: ${ALLOWED_EXTENSIONS.join(', ')}`, 'path_forbidden')
  }

  const normalized = path.normalize(filePath)

  let realPath: string
  try {
    realPath = await fs.promises.realpath(normalized)
  } catch (e) {
    throw new NovelParseError(`无法解析路径: ${filePath}`, 'path_forbidden', e)
  }

  if (realPath !== normalized && realPath !== filePath) {
    throw new NovelParseError(`路径包含符号链接或解析异常: ${filePath}`, 'path_forbidden')
  }

  let stats: fs.Stats
  try {
    stats = await fs.promises.stat(realPath)
  } catch (e) {
    throw new NovelParseError(`无法访问文件: ${filePath}`, 'read_failed', e)
  }

  if (!stats.isFile()) {
    throw new NovelParseError(`路径不是文件: ${filePath}`, 'path_forbidden')
  }

  const maxSizeBytes = options.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES
  if (stats.size > maxSizeBytes) {
    throw new NovelParseError(
      `文件大小超过限制: ${(stats.size / 1024 / 1024).toFixed(1)}MB > ${(maxSizeBytes / 1024 / 1024).toFixed(0)}MB`,
      'file_too_large'
    )
  }
}
