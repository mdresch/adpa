import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  console.log("Connecting to MCP Server...");
  
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "scripts/mcp-server-sentry.ts"],
  });

  const client = new Client(
    {
      name: "mcp-sentry-test-client",
      version: "1.0.0",
    },
    {
      capabilities: {
        sampling: {},
      },
    }
  );

  await client.connect(transport);
  console.log("Connected to MCP Server!");

  console.log("Listing prompts...");
  const prompts = await client.listPrompts({});
  console.log("Prompts:", prompts.prompts.map((p) => p.name));

  console.log("Getting prompt...");
  const promptResult = await client.getPrompt({
    name: "adpa-summary-prompt",
    arguments: { topic: "semantic search rollout" },
  });
  console.log("Prompt message count:", promptResult.messages.length);

  console.log("Listing resources...");
  const resources = await client.listResources({});
  console.log("Resources:", resources.resources.map((r) => r.uri));

  console.log("Reading resource...");
  const resourceResult = await client.readResource({
    uri: "https://adpa.local/resources/status",
  });
  console.log("Resource content count:", resourceResult.contents.length);

  // Call the ping tool
  console.log("Calling ping tool...");
  const result = await client.callTool({
    name: "ping",
    arguments: {
      message: "Hello from test client!",
    },
  });

  console.log("Ping Result:", JSON.stringify(result, null, 2));

  // Call the ping tool with error to trigger Sentry exception
  console.log("Calling ping tool with error trigger...");
  try {
    await client.callTool({
      name: "ping",
      arguments: {
        message: "error",
      },
    });
  } catch (error) {
    console.log("Caught expected error:", error);
  }

  console.log("Test complete. Check your Sentry dashboard for transactions and errors.");
  await client.close();
}

main().catch((error) => {
  console.error("Fatal error in test client:", error);
});
