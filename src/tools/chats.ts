import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PeecApiClient } from "../api-client.js";
import { requireProjectId, dateSchema, validateDateRange, summaryForList, toolResult, toolError } from "../util.js";
import type { Chat } from "../types.js";

/** Registers the list_chats tool for retrieving AI chat interactions with optional date filtering. */
export function registerChatsTool(server: McpServer, client: PeecApiClient) {
  server.registerTool(
    "list_chats",
    {
      description: "List AI chat interactions tracked by Peec AI. Returns up to limit results (default: 100). Recommended: use date filters to scope results. Returns chat IDs, prompt/model refs, and dates. Without date filters, returns all chats.",
      inputSchema: {
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
        start_date: dateSchema.describe("Start date filter (YYYY-MM-DD). Omit for no lower bound.").optional(),
        end_date: dateSchema.describe("End date filter (YYYY-MM-DD). Omit for no upper bound.").optional(),
        brand_id: z.string().describe("Filter by brand ID. Use list_brands to find IDs.").optional(),
        prompt_id: z.string().describe("Filter by prompt ID. Use list_prompts to find IDs.").optional(),
        model_id: z.string().describe("Filter by model ID. Use list_models to find IDs.").optional(),
        limit: z.number().min(1).max(10000).default(100).describe("Max results (1-10000, default: 100)").optional(),
        offset: z.number().min(0).default(0).describe("Results to skip").optional(),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ project_id, start_date, end_date, brand_id, prompt_id, model_id, limit, offset }) => {
      try {
        const dates = validateDateRange(start_date, end_date);
        const data = await client.get<Chat[]>("/chats", {
          project_id: requireProjectId(project_id),
          start_date: dates.start_date,
          end_date: dates.end_date,
          brand_id,
          prompt_id,
          model_id,
          limit,
          offset,
        });
        return toolResult({ _summary: summaryForList("chats", data), chats: data });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
