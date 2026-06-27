import { logger } from '../utils/logger'

const PRIVATE_CIDR_BLOCKS = [
  { ip: 0x0a000000, mask: 0xff000000 }, // 10.0.0.0/8
  { ip: 0xac100000, mask: 0xfff00000 }, // 172.16.0.0/12
  { ip: 0xc0a80000, mask: 0xffff0000 }, // 192.168.0.0/16
  { ip: 0x7f000000, mask: 0xff000000 }, // 127.0.0.0/8 (loopback)
  { ip: 0x00000000, mask: 0xff000000 }, // 0.0.0.0/8
  { ip: 0xa9fe0000, mask: 0xffff0000 }, // 169.254.0.0/16 (link-local)
  { ip: 0xe0000000, mask: 0xf0000000 }, // 224.0.0.0/4 (multicast)
  { ip: 0xff000000, mask: 0xff000000 } // 255.0.0.0/8 (broadcast)
]

function ipv4ToInt(parts: number[]): number {
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

function isPrivateIP(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true
  if (hostname.endsWith('.local') || hostname.endsWith('.localhost')) return true

  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!ipv4Match) return false

  const parts = [parseInt(ipv4Match[1]), parseInt(ipv4Match[2]), parseInt(ipv4Match[3]), parseInt(ipv4Match[4])]
  if (parts.some(p => p < 0 || p > 255)) return false

  const ipInt = ipv4ToInt(parts)
  return PRIVATE_CIDR_BLOCKS.some(block => (ipInt & block.mask) === block.ip)
}

export function validateEndpoint(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`无效的 API 地址: ${url}`)
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`不支持的协议: ${parsed.protocol}，仅支持 HTTPS 和 HTTP`)
  }

  if (isPrivateIP(parsed.hostname)) {
    logger.warn(`[Security] 检测到私有网络地址作为 API 端点: ${parsed.hostname}，已阻止`)
    throw new Error(`不允许连接到私有网络地址: ${parsed.hostname}`)
  }

  return url
}
