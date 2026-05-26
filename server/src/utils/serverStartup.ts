type StartupEnv = Pick<NodeJS.ProcessEnv, 'JEST_WORKER_ID' | 'NODE_ENV'>

export function shouldStartServerForArgv(argv = process.argv, env: StartupEnv = process.env): boolean {
  if (env.NODE_ENV === 'test' || env.JEST_WORKER_ID) {
    return false
  }

  const hasServerEntrypoint = argv.slice(1).some((arg) => {
    const normalized = arg.replace(/\\/g, '/').toLowerCase()
    return (
      normalized === 'src/server.ts' ||
      normalized === 'src/server.js' ||
      normalized.endsWith('/src/server.ts') ||
      normalized.endsWith('/src/server.js')
    )
  })

  if (hasServerEntrypoint) {
    return true
  }

  // Some tsx/nodemon launch paths on Windows evaluate the server module without
  // preserving the script path in process.argv. Outside test runners, loading this
  // module means the backend should boot.
  return true
}
