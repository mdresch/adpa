// Node.js script to run a PMBOKProcessAgent from JSON stdin and output result as JSON
const { PMBOKProcessAgent } = require('./PMBOKProcessAgent')
const { runProcessWithAI } = require('./aiUtil')

async function main() {
  let input = ''
  process.stdin.setEncoding('utf8')
  for await (const chunk of process.stdin) {
    input += chunk
  }
  const args = JSON.parse(input)
  const agent = new PMBOKProcessAgent(
    args.code,
    args.name,
    args.description,
    args.inputs,
    args.tools,
    args.outputs
  )
  try {
    const result = await agent.run(args.data, args.userId, args.projectId, args.documentId)
    process.stdout.write(JSON.stringify(result))
  } catch (err) {
    process.stderr.write(err && err.stack ? err.stack : String(err))
    process.exit(1)
  }
}
main()
