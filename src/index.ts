#!/usr/bin/env node
/**
 * Peec.ai MCP Server
 *
 * Exposes the Peec.ai Customer API as MCP tools for AI Search Analytics —
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

const apiKey = process.env.PEECAI_API_KEY;
if (!apiKey) {
  console.error("PEECAI_API_KEY environment variable is required");
  process.exit(1);
}

const client = new PeecApiClient(apiKey);

const server = new McpServer({
  name: "peecai",
  version: "0.1.0",
});

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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Peec.ai MCP server running on stdio");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
