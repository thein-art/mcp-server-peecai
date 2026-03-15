import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PeecApiClient } from "../api-client.js";
import { requireProjectId, summaryForList, toolResult, toolError } from "../util.js";
import type { Prompt } from "../types.js";

/** Registers the list_prompts tool for retrieving search prompts with metadata. */
export function registerPromptsTool(server: McpServer, client: PeecApiClient) {
  server.registerTool(
    "list_prompts",
    {
      description: "List search prompts for a Peec AI project. Returns prompt IDs, messages, tags, topics, locations, and search volume.",
      inputSchema: {
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
        limit: z.number().min(1).max(10000).default(1000).describe("Max results (1-10000)").optional(),
        offset: z.number().min(0).default(0).describe("Results to skip").optional(),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ project_id, limit, offset }) => {
      try {
        const data = await client.get<Prompt[]>("/prompts", {
          project_id: requireProjectId(project_id),
          limit,
          offset,
        });
        return toolResult({ _summary: summaryForList("prompts", data), prompts: data });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
