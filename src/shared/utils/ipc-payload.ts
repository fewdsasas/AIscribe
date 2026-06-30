/**
 * IPC payload utilities.
 *
 * Electron's structured clone algorithm can move large payloads, but very large
 * strings (e.g. chapter content with hundreds of thousands of characters) can
 * cause jank on the renderer main thread. These helpers allow callers to split
 * a large payload into fixed-size chunks on one side and reassemble it on the
 * other side, keeping each IPC message under a configurable byte budget.
 */

/** Default chunk size: 256KB per IPC message. */
export const DEFAULT_CHUNK_SIZE = 256 * 1024

/** Maximum recommended payload size before chunking should be considered. */
export const LARGE_PAYLOAD_THRESHOLD = 1024 * 1024

/**
 * Split a string into chunks of at most `chunkSize` bytes (UTF-8 encoded).
 * The split is done on character boundaries so chunks are valid strings.
 */
export function chunkString(input: string, chunkSize = DEFAULT_CHUNK_SIZE): string[] {
  if (input.length === 0) return []

  const chunks: string[] = []
  const encoder = new TextEncoder()
  let start = 0

  while (start < input.length) {
    let end = Math.min(input.length, start + chunkSize)
    let slice = input.slice(start, end)

    // Binary search the largest character boundary that fits within chunkSize bytes.
    let byteLength = encoder.encode(slice).length
    if (byteLength > chunkSize) {
      let low = start
      let high = end
      while (low < high) {
        const mid = Math.floor((low + high) / 2)
        slice = input.slice(start, mid)
        byteLength = encoder.encode(slice).length
        if (byteLength <= chunkSize) {
          low = mid + 1
        } else {
          high = mid
        }
      }
      end = low - 1
    }

    chunks.push(input.slice(start, end))
    start = end
  }

  return chunks
}

/** Reassemble chunks produced by `chunkString`. */
export function recombineChunks(chunks: string[]): string {
  return chunks.join('')
}

/** Estimate the serialized byte length of a value. */
export function estimatePayloadSize(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length
}

/** Determine whether a payload exceeds the recommended threshold. */
export function isLargePayload(value: unknown): boolean {
  return estimatePayloadSize(value) > LARGE_PAYLOAD_THRESHOLD
}
