import { shouldStartServerForArgv } from '../utils/serverStartup'

describe('server startup guard', () => {
  it('starts when tsx passes src/server.ts as a later argv entry on Windows', () => {
    expect(
      shouldStartServerForArgv([
        'node.exe',
        'node_modules\\tsx\\dist\\cli.mjs',
        'src\\server.ts',
      ]),
    ).toBe(true)
  })

  it('does not start when imported by a test runner', () => {
    expect(shouldStartServerForArgv(['node.exe', 'jest'], { NODE_ENV: 'test' })).toBe(false)
  })
})
