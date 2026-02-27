/**
 * Simple performance tracking utility
 */

let dbOperationCount = 0
let authCallCount = 0

export function incrementDbOperationCount(): number {
    dbOperationCount++
    return dbOperationCount
}

export function getDbOperationCount(): number {
    return dbOperationCount
}

export function resetDbOperationCount(): void {
    dbOperationCount = 0
}

export function incrementAuthCallCount(): number {
    authCallCount++
    return authCallCount
}

export function getAuthCallCount(): number {
    return authCallCount
}

export function resetAuthCallCount(): void {
    authCallCount = 0
}

export function resetAllCounters(): void {
    dbOperationCount = 0
    authCallCount = 0
}
