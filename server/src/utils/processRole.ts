/**
 * Returns the current process role configured for this instance.
 * Defaults to "all" (both API server and background workers).
 */
export function getProcessRole(): string {
  const role = process.env.ADPA_PROCESS_ROLE;
  if (!role) return "all";
  const normalized = role.toLowerCase().trim();
  return ["api", "worker", "all"].includes(normalized) ? normalized : "all";
}

/**
 * Checks whether the background queue workers should run under the current process role.
 */
export function shouldRunWorkers(): boolean {
  const role = getProcessRole();
  return role === "worker" || role === "all";
}

/**
 * Checks whether the Express web/API server should run under the current process role.
 */
export function shouldRunWebServer(): boolean {
  const role = getProcessRole();
  return role === "api" || role === "all";
}
