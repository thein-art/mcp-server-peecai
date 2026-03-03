import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PeecApiClient } from "../api-client.js";
import { requireProjectId, toolResult, toolError } from "../util.js";
import type { Prompt } from "../types.js";

/** Registers the list_prompts tool for retrieving search prompts with metadata. */
export function registerPromptsTool(server: McpServer, client: PeecApiClient) {
  server.tool(
    "list_prompts",
    "List search prompts for a Peec.ai project. Returns prompt IDs, messages, tags, topics, locations, and search volume.",
    {
      project_id: z.string().describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
      limit: z.number().min(1).max(10000).default(1000).describe("Max results (1-10000)").optional(),
      offset: z.number().min(0).default(0).describe("Results to skip").optional(),
    },
    async ({ project_id, limit, offset }) => {
      try {
        const data = await client.get<Prompt[]>("/prompts", {
          project_id: requireProjectId(project_id),
          limit,
          offset,
        });
        return toolResult(data);
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
