import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PeecApiClient } from "../api-client.js";
import { requireProjectId, summaryForList, toolResult, toolError } from "../util.js";
import type { Model } from "../types.js";

/** Registers the list_models tool for retrieving tracked AI models. */
export function registerModelsTool(server: McpServer, client: PeecApiClient) {
  server.tool(
    "list_models",
    "List AI models tracked by Peec.ai (ChatGPT, Perplexity, etc.). Returns model IDs and active status.",
    {
      project_id: z.string().describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
      limit: z.number().min(1).max(10000).default(1000).describe("Max results (1-10000)").optional(),
      offset: z.number().min(0).default(0).describe("Results to skip").optional(),
    },
    async ({ project_id, limit, offset }) => {
      try {
        const data = await client.get<Model[]>("/models", {
          project_id: requireProjectId(project_id),
          limit,
          offset,
        });
        return toolResult({ _summary: summaryForList("models", data), models: data });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
