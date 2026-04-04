import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PeecApiClient } from "../api-client.js";
import { requireProjectId, summaryForList, toolResult, toolError } from "../util.js";
import { promptSuggestionsOutput } from "../schemas.js";
import type { PromptSuggestion } from "../types.js";

/** Registers the list_prompt_suggestions tool for retrieving suggested prompts. */
export function registerPromptSuggestionsTool(server: McpServer, client: PeecApiClient) {
  server.registerTool(
    "list_prompt_suggestions",
    {
      title: "List Prompt Suggestions",
      description: "List suggested prompts for a Peec AI project. Suggestions can be accepted to create prompts or rejected to dismiss them.",
      inputSchema: {
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
        topic_id: z.string().min(1).describe("Filter by topic ID").optional(),
        limit: z.number().min(1).max(10000).default(1000).describe("Max results (1-10000)").optional(),
        offset: z.number().min(0).default(0).describe("Results to skip").optional(),
      },
      outputSchema: promptSuggestionsOutput,
      annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ project_id, topic_id, limit, offset }, extra) => {
      try {
        const data = await client.get<PromptSuggestion[]>("/prompts/suggestions", {
          project_id: requireProjectId(project_id),
          topic_id,
          limit,
          offset,
        }, extra.signal);
        return toolResult({ _summary: summaryForList("prompt suggestions", data), prompt_suggestions: data });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
