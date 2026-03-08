#!/usr/bin/env node
/**
 * Peec AI MCP Server
 *
 * Exposes the Peec AI Customer API as MCP tools for AI Search Analytics —
 * brand visibility, sentiment, citations, and domain/URL analysis across
 * AI models like ChatGPT and Perplexity.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PeecApiClient } from "./api-client.js";
import { registerProjectsTool } from "./tools/projects.js";
import { registerBrandsTool } from "./tools/brands.js";
import { registerPromptsTool } from "./tools/prompts.js";
import { registerTagsTool } from "./tools/tags.js";
import { registerTopicsTool } from "./tools/topics.js";
import { registerModelsTool } from "./tools/models.js";
import { registerChatsTool } from "./tools/chats.js";
import { registerChatContentTool } from "./tools/chat-content.js";
import { registerBrandsReportTool } from "./tools/report-brands.js";
import { registerDomainsReportTool } from "./tools/report-domains.js";
import { registerUrlsReportTool } from "./tools/report-urls.js";
import { registerPromptTemplates } from "./prompts.js";
import type { Project } from "./types.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const apiKey = process.env.PEECAI_API_KEY;
if (!apiKey) {
  console.error("PEECAI_API_KEY environment variable is required");
  process.exit(1);
}

const client = new PeecApiClient(apiKey);

const server = new McpServer({
  name: "peecai",
  version,
});

// Register tools
registerProjectsTool(server, client);
registerBrandsTool(server, client);
registerPromptsTool(server, client);
registerTagsTool(server, client);
registerTopicsTool(server, client);
registerModelsTool(server, client);
registerChatsTool(server, client);
registerChatContentTool(server, client);
registerBrandsReportTool(server, client);
registerDomainsReportTool(server, client);
registerUrlsReportTool(server, client);

// Register MCP prompts (guided workflows)
registerPromptTemplates(server);

// Register resource: projects://list
server.resource("projects-list", "projects://list", {
  description: "List all available Peec AI projects for the authenticated account.",
  mimeType: "application/json",
}, async () => {
  const projects = await client.get<Project[]>("/projects", { limit: 1000 });
  return {
    contents: [{
      uri: "projects://list",
      mimeType: "application/json",
      text: JSON.stringify(projects),
    }],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Peec AI MCP server running on stdio");

  // Graceful shutdown with timeout fallback
  const shutdown = async () => {
    console.error("Shutting down Peec AI MCP server…");
    const forceExit = setTimeout(() => process.exit(1), 5_000);
    try {
      await server.close();
    } finally {
      clearTimeout(forceExit);
    }
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error("Fatal error:", e instanceof Error ? e.message : e);
  process.exit(1);
});
