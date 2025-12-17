// JS/TS wrapper for PMBOK process agent using project AIService
import { runProcessWithAI } from './aiUtil'

export class PMBOKProcessAgent {
  code: string
  name: string
  description: string
  inputs: string[]
  tools: string[]
  outputs: string[]

  constructor(code: string, name: string, description: string, inputs: string[], tools: string[], outputs: string[]) {
    this.code = code
    this.name = name
    this.description = description
    this.inputs = inputs
    this.tools = tools
    this.outputs = outputs
  }

  async run(data: any, userId?: string, projectId?: string, documentId?: string) {
    // Compose a prompt for this process
    const prompt = `You are executing PMBOK process ${this.code} (${this.name}).\nDescription: ${this.description}\nInputs: ${JSON.stringify(this.inputs)}\nTools: ${JSON.stringify(this.tools)}\nOutputs: ${JSON.stringify(this.outputs)}\nContext: ${JSON.stringify(data)}\nPlease perform this process and return the result.`
    return runProcessWithAI(this.code, prompt, userId, projectId, documentId)
  }
}
