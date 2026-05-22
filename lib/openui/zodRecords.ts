import { z } from "zod/v4"

/** Zod 4 requires key + value schemas; single-arg z.record() breaks OpenUI's schema walker. */
export const stringRecord = z.record(z.string(), z.string())

export const looseRecord = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
