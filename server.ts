import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create an MCP server
const server = new McpServer({
  name: "HelloWorld",
  version: "1.0.0"
});

// Add a hello world tool
server.tool(
  "hello",
  { name: z.string().optional() },
  async ({ name }) => ({
    content: [{ 
      type: "text", 
      text: `Hello ${name || "world"}!` 
    }]
  })
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);