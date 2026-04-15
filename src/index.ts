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
import { registerModelChannelsTool } from "./tools/model-channels.js";
import { registerChatsTool } from "./tools/chats.js";
import { registerChatContentTool } from "./tools/chat-content.js";
import { registerBrandsReportTool } from "./tools/report-brands.js";
import { registerDomainsReportTool } from "./tools/report-domains.js";
import { registerUrlsReportTool } from "./tools/report-urls.js";
import { registerSearchQueriesTool } from "./tools/queries-search.js";
import { registerShoppingQueriesTool } from "./tools/queries-shopping.js";
import { registerPromptSuggestionsTool } from "./tools/prompt-suggestions.js";
import { registerTopicSuggestionsTool } from "./tools/topic-suggestions.js";
import { registerWriteBrandsTools } from "./tools/write-brands.js";
import { registerWritePromptsTools } from "./tools/write-prompts.js";
import { registerWriteTagsTools } from "./tools/write-tags.js";
import { registerWriteTopicsTools } from "./tools/write-topics.js";
import { registerSuggestionActionTools } from "./tools/suggestion-actions.js";
import { registerPromptTemplates } from "./prompts.js";
import type { Brand, Model, ModelChannel, Prompt, Project, Tag, Topic } from "./types.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const apiKey = process.env.PEECAI_API_KEY;
if (!apiKey) {
  console.error("PEECAI_API_KEY environment variable is required");
  process.exit(1);
}

const allowWrites = process.env.PEECAI_ALLOW_WRITES === "true";

const server = new McpServer(
  { name: "peecai", version },
  {
    capabilities: { logging: {} },
    instructions: [
      "This server provides AI search analytics from Peec AI.",
      "",
      "## Getting started",
      "Most tools require a project_id — call list_projects first to find available project IDs.",
      "If PEECAI_PROJECT_ID is set, it will be used as the default when project_id is omitted.",
      "",
      "## Analytics workflow",
      "1. list_projects → pick a project ID",
      "2. list_brands / list_prompts / list_models → understand dimensions",
      "3. get_brands_report / get_domains_report / get_urls_report → analytics with date ranges and dimensional breakdowns",
      "4. search_queries / shopping_queries → see what queries AI models generated",
      "5. list_chats → find specific chats, then get_chat_content for full details",
      "",
      "## Reports",
      "Specify date ranges with start_date/end_date (YYYY-MM-DD). Use dimensions to break down by model, prompt, tag, topic, date, or country.",
      "Use filters for server-side filtering. Default limit is 100; max is 10000.",
      "",
      "## Suggestions",
      "list_prompt_suggestions / list_topic_suggestions show AI-generated suggestions that can be reviewed.",
      allowWrites
        ? "\n## Write operations (enabled)\nCRUD tools are available for brands, prompts, tags, and topics. Suggestion accept/reject tools are also available. Delete operations are soft-deletes and irreversible through the API."
        : "",
    ].join("\n"),
  },
);

const client = new PeecApiClient(apiKey, (level, data) => {
  server.sendLoggingMessage({ level, logger: "peecai-api", data }).catch(() => {});
});

// Register tools
registerProjectsTool(server, client);
registerBrandsTool(server, client);
registerPromptsTool(server, client);
registerTagsTool(server, client);
registerTopicsTool(server, client);
registerModelsTool(server, client);
registerModelChannelsTool(server, client);
registerChatsTool(server, client);
registerChatContentTool(server, client);
registerBrandsReportTool(server, client);
registerDomainsReportTool(server, client);
registerUrlsReportTool(server, client);
registerSearchQueriesTool(server, client);
registerShoppingQueriesTool(server, client);
registerPromptSuggestionsTool(server, client);
registerTopicSuggestionsTool(server, client);

// Register write tools (gated by PEECAI_ALLOW_WRITES)
if (allowWrites) {
  registerWriteBrandsTools(server, client);
  registerWritePromptsTools(server, client);
  registerWriteTagsTools(server, client);
  registerWriteTopicsTools(server, client);
  registerSuggestionActionTools(server, client);
}

// Register MCP prompts (guided workflows)
registerPromptTemplates(server, client);

// Register resources
server.registerResource("projects", "peecai://projects", {
  title: "Peec AI Projects",
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
  title: string;
  endpoint: string;
  description: string;
}> = [
  { name: "brands", title: "Brands", endpoint: "/brands", description: "Tracked brands and their domains for a project." },
  { name: "tags", title: "Tags", endpoint: "/tags", description: "Category tags for a project." },
  { name: "topics", title: "Topics", endpoint: "/topics", description: "Topic groupings for a project." },
  { name: "models", title: "AI Models", endpoint: "/models", description: "AI models tracked by Peec AI for a project." },
  { name: "model-channels", title: "Model Channels", endpoint: "/model-channels", description: "Model channels (stable identifiers grouping one or more models) for a project." },
  { name: "prompts", title: "Prompts", endpoint: "/prompts", description: "Search prompts monitored across AI models for a project." },
];

for (const { name, title, endpoint, description } of dimensionResources) {
  server.registerResource(
    name,
    new ResourceTemplate(`peecai://projects/{project_id}/${name}`, {
      list: async () => {
        try {
          const projects = await client.get<Project[]>("/projects", { limit: 1000 });
          return {
            resources: projects.map((p) => ({
              uri: `peecai://projects/${p.id}/${name}`,
              name: `${p.name} — ${title}`,
              mimeType: "application/json",
            })),
          };
        } catch {
          return { resources: [] };
        }
      },
    }),
    { title, description, mimeType: "application/json" },
    async (uri, { project_id }) => {
      try {
        const data = await client.get<(Brand | Tag | Topic | Model | ModelChannel | Prompt)[]>(endpoint, {
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
  console.error(`Peec AI MCP server running on stdio${allowWrites ? " (write tools enabled)" : ""}`);

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
