import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PeecApiClient } from "../api-client.js";
import { requireProjectId, summaryForList, toolResult, toolError } from "../util.js";
import { topicSuggestionsOutput } from "../schemas.js";
import type { TopicSuggestion } from "../types.js";

/** Registers the list_topic_suggestions tool for retrieving suggested topics. */
export function registerTopicSuggestionsTool(server: McpServer, client: PeecApiClient) {
  server.registerTool(
    "list_topic_suggestions",
    {
      title: "List Topic Suggestions",
      description: "List suggested topics for a Peec AI project. Suggestions can be accepted to create topics or rejected to dismiss them.",
      inputSchema: {
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
        limit: z.number().min(1).max(10000).default(1000).describe("Max results (1-10000)").optional(),
        offset: z.number().min(0).default(0).describe("Results to skip").optional(),
      },
      outputSchema: topicSuggestionsOutput,
      annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ project_id, limit, offset }, extra) => {
      try {
        const data = await client.get<TopicSuggestion[]>("/topics/suggestions", {
          project_id: requireProjectId(project_id),
          limit,
          offset,
        }, extra.signal);
        return toolResult({ _summary: summaryForList("topic suggestions", data), topic_suggestions: data });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
