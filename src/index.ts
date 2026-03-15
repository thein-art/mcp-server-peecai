#!/usr/bin/env node
/**
 * Peec AI MCP Server
 *
 * Exposes the Peec AI Customer API as MCP tools for AI Search Analytics —
 * brand visibility, sentiment, citations, and domain/URL analysis across
 * AI models like ChatGPT and Perplexity.
 */

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
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
import { registerSearchQueriesTool } from "./tools/queries-search.js";
import { registerShoppingQueriesTool } from "./tools/queries-shopping.js";
import { registerPromptTemplates } from "./prompts.js";
import type { Brand, Model, Prompt, Project, Tag, Topic } from "./types.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const apiKey = process.env.PEECAI_API_KEY;
if (!apiKey) {
  console.error("PEECAI_API_KEY environment variable is required");
  process.exit(1);
}

const client = new PeecApiClient(apiKey);

const server = new McpServer(
  { name: "peecai", version },
  {
    instructions: "This server provides AI search analytics from Peec AI. " +
      "Most tools require a project_id parameter — call list_projects first to find available project IDs. " +
      "If PEECAI_PROJECT_ID is set, it will be used as the default when project_id is omitted. " +
      "For reports (brands, domains, URLs), specify date ranges with start_date/end_date. " +
      "Use search_queries and shopping_queries to see what queries AI models generated. " +
      "Use list_brands, list_models, list_prompts to resolve IDs returned in reports.",
  },
);

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
registerSearchQueriesTool(server, client);
registerShoppingQueriesTool(server, client);

// Register MCP prompts (guided workflows)
registerPromptTemplates(server, client);

// Register resources
server.registerResource("projects", "peecai://projects", {
  description: "List all available Peec AI projects for the authenticated account.",
  mimeType: "application/json",
}, async () => {
  try {
    const projects = await client.get<Project[]>("/projects", { limit: 1000 });
    return {
      contents: [{
        uri: "peecai://projects",
        mimeType: "application/json",
        text: JSON.stringify(projects),
      }],
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to fetch projects: ${message}`);
  }
});

// Register resource templates for dimension lookups
const dimensionResources: Array<{
  name: string;
  endpoint: string;
  description: string;
}> = [
  { name: "brands", endpoint: "/brands", description: "Tracked brands and their domains for a project." },
  { name: "tags", endpoint: "/tags", description: "Category tags for a project." },
  { name: "topics", endpoint: "/topics", description: "Topic groupings for a project." },
  { name: "models", endpoint: "/models", description: "AI models tracked by Peec AI for a project." },
  { name: "prompts", endpoint: "/prompts", description: "Search prompts monitored across AI models for a project." },
];

for (const { name, endpoint, description } of dimensionResources) {
  server.registerResource(
    name,
    new ResourceTemplate(`peecai://projects/{project_id}/${name}`, { list: undefined }),
    { description, mimeType: "application/json" },
    async (uri, { project_id }) => {
      try {
        const data = await client.get<(Brand | Tag | Topic | Model | Prompt)[]>(endpoint, {
          project_id: String(project_id),
          limit: 10000,
        });
        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(data),
          }],
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        throw new Error(`Failed to fetch ${name}: ${message}`);
      }
    },
  );
}

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
