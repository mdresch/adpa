import governance from './governanceDecisions'

(async () => {
  try {
    await governance.run()
    // eslint-disable-next-line no-process-exit
    process.exit(0)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('run-governance failed:', err)
    // eslint-disable-next-line no-process-exit
    process.exit(1)
  }
})()
