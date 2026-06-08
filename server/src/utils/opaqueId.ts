import { randomUUID } from 'crypto'

/** Correlation IDs for internal records (not cryptographic secrets). */
export function opaqueId(prefix: string): string {
  return `${prefix}_${randomUUID()}`
}
