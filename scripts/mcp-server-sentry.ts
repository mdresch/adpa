import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

// Initialize Sentry for MCP
Sentry.init({
  dsn: "https://43b80fff98cd35435bc8349afd9ce291@o4509261600522240.ingest.de.sentry.io/4510955705008208",
  tracesSampleRate: 1.0,
  sendDefaultPii: true,
});

console.error("Starting MCP Server with Sentry monitoring...");

// Create MCP Server instance
const server = new McpServer({
  name: "adpa-mcp-sentry-demo",
  version: "1.0.0",
});

// WRAP THE SERVER WITH SENTRY - This is the key step for monitoring
const sentryServer = Sentry.wrapMcpServerWithSentry(server);

sentryServer.prompt(
  "adpa-summary-prompt",
  "Create a short ADPA semantic-search status summary",
  {
    topic: z.string().describe("Topic to summarize"),
  },
  async ({ topic }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Provide a concise ADPA status summary for: ${topic}`,
          },
        },
      ],
    };
  }
);

sentryServer.resource(
  "adpa-status-resource",
  "https://adpa.local/resources/status",
  { mimeType: "application/json" },
  async () => {
    return {
      contents: [
        {
          uri: "https://adpa.local/resources/status",
          text: JSON.stringify({
            service: "adpa-mcp-sentry-demo",
            status: "ok",
            checkedAt: new Date().toISOString(),
          }),
          mimeType: "application/json",
        },
      ],
    };
  }
);

// Define a tool that will be monitored
sentryServer.tool(
  "ping",
  "A simple ping tool to verify connectivity and monitoring",
  {
    message: z.string().optional().describe("Optional message to echo back"),
  },
  async ({ message }) => {
    console.error(`Received ping with message: ${message}`);
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // You can manually add breadcrumbs or capture messages if needed
    Sentry.addBreadcrumb({
      category: "mcp",
      message: "Processing ping request",
      level: "info",
    });

    if (message === "error") {
      throw new Error("Simulated error in MCP tool");
    }

    return {
      content: [{ type: "text", text: `Pong! You said: ${message || "nothing"}` }],
    };
  }
);

// Start the server using Stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await sentryServer.connect(transport);
  console.error("MCP Server running on stdio. You can connect to this using an MCP inspector or client.");
}

main().catch((error) => {
  console.error("Fatal error in MCP server:", error);
  Sentry.captureException(error);
});
