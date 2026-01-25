/**
 * Digital Twin state comparison utilities (hash-based).
 * Used by event processing and trigger evaluation.
 * @see plans/DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md
 */

import * as crypto from 'crypto';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/**
 * Normalize JSONB-like value for stable hashing: sort object keys recursively.
 */
function normalizeForHash(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeForHash);
  }
  const o = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(o).sort()) {
    sorted[k] = normalizeForHash(o[k]);
  }
  return sorted;
}

/**
 * Compute a deterministic SHA-256 hash of a state snapshot (JSONB).
 * Use for deduplication and change detection.
 */
export function calculateStateHash(state: Record<string, unknown> | unknown): string {
  const normalized = normalizeForHash(state);
  const str = JSON.stringify(normalized);
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

/**
 * Return keys that differ between previous and current state (shallow + nested keys as dot-path).
 * Only reports paths where the value actually changed.
 */
export function detectChangedFields(
  previousState: Record<string, unknown> | null | undefined,
  currentState: Record<string, unknown> | null | undefined
): string[] {
  const changed: string[] = [];
  const prev = previousState ?? {};
  const curr = currentState ?? {};
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);

  function walk(p: unknown, c: unknown, prefix: string) {
    if (p === c) return;
    if (typeof p !== 'object' || p === null || typeof c !== 'object' || c === null) {
      if (p !== c) changed.push(prefix || 'value');
      return;
    }
    if (Array.isArray(p) && Array.isArray(c)) {
      if (JSON.stringify(p) !== JSON.stringify(c)) changed.push(prefix || 'value');
      return;
    }
    const po = p as Record<string, unknown>;
    const co = c as Record<string, unknown>;
    const keys = new Set([...Object.keys(po), ...Object.keys(co)]);
    for (const k of keys) {
      const path = prefix ? `${prefix}.${k}` : k;
      const pv = po[k];
      const cv = co[k];
      if (typeof pv === 'object' && pv !== null && typeof cv === 'object' && cv !== null && !Array.isArray(pv) && !Array.isArray(cv)) {
        walk(pv, cv, path);
      } else if (JSON.stringify(pv) !== JSON.stringify(cv)) {
        changed.push(path);
      }
    }
  }

  for (const k of allKeys) {
    walk(prev[k], curr[k], k);
  }
  return changed;
}

export interface StateDiff {
  changedFields: string[];
  previousHash: string;
  currentHash: string;
  changeSummary?: string;
}

/**
 * Build a state diff between previous and current snapshots.
 */
export function generateStateDiff(
  previousState: Record<string, unknown> | null | undefined,
  currentState: Record<string, unknown> | null | undefined
): StateDiff {
  const changedFields = detectChangedFields(previousState, currentState);
  const previousHash = calculateStateHash(previousState ?? {});
  const currentHash = calculateStateHash(currentState ?? {});
  const changeSummary = changedFields.length
    ? `Changed: ${changedFields.join(', ')}`
    : previousHash !== currentHash
      ? 'Structural or ordering change'
      : undefined;
  return {
    changedFields,
    previousHash,
    currentHash,
    changeSummary,
  };
}
