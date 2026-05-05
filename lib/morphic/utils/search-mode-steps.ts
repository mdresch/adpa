import type { SearchMode } from '@/lib/morphic/types/search'

/**
 * Single source of truth for the maximum tool-call steps per search mode.
 * Both the researcher agent and the stream response use this mapping so that
 * changes only need to be made in one place.
 */
const STEPS_BY_MODE: Record<SearchMode, number> = {
    quick: 20,
    adaptive: 50,
    deep: 100,
    utility: 50,
    planning: 50
}

export function getMaxStepsForMode(mode: SearchMode | undefined): number {
    if (!mode) return STEPS_BY_MODE.adaptive
    return STEPS_BY_MODE[mode] ?? STEPS_BY_MODE.adaptive
}
