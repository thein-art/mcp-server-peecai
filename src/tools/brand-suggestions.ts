import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PeecApiClient } from "../api-client.js";
import { requireProjectId, summaryForList, toolResult, toolError } from "../util.js";
import { brandSuggestionsOutput } from "../schemas.js";
import type { BrandSuggestion } from "../types.js";

/** Registers the list_brand_suggestions tool for retrieving suggested brands. */
export function registerBrandSuggestionsTool(server: McpServer, client: PeecApiClient) {
  server.registerTool(
    "list_brand_suggestions",
    {
      title: "List Brand Suggestions",
      description: "List open brand suggestions for a Peec AI project. Suggestions can be accepted to convert into a brand or rejected to dismiss them.",
      inputSchema: {
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
        limit: z.number().min(1).max(10000).default(1000).describe("Max results (1-10000)").optional(),
        offset: z.number().min(0).default(0).describe("Results to skip").optional(),
      },
      outputSchema: brandSuggestionsOutput,
      annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ project_id, limit, offset }, extra) => {
      try {
        const data = await client.get<BrandSuggestion[]>("/brands/suggestions", {
          project_id: requireProjectId(project_id),
          limit,
          offset,
        }, extra.signal);
        return toolResult({ _summary: summaryForList("brand suggestions", data), brand_suggestions: data });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
