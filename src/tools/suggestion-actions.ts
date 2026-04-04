import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PeecApiClient } from "../api-client.js";
import { requireProjectId, requireSafeId, toolResult, toolError } from "../util.js";

/** Registers tools for accepting and rejecting prompt and topic suggestions. */
export function registerSuggestionActionTools(server: McpServer, client: PeecApiClient) {
  server.registerTool(
    "accept_prompt_suggestion",
    {
      title: "Accept Prompt Suggestion",
      description: "Accept a prompt suggestion, creating a new prompt from it.",
      inputSchema: {
        prompt_suggestion_id: z.string().min(1).describe("Prompt suggestion ID to accept"),
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ prompt_suggestion_id, project_id }, extra) => {
      try {
        requireSafeId(prompt_suggestion_id, "prompt_suggestion_id");
        const result = await client.postRaw<{ id: string }>(
          "/prompts/suggestions/" + encodeURIComponent(prompt_suggestion_id) + "/accept",
          {},
          { project_id: requireProjectId(project_id) },
          extra.signal,
        );
        return toolResult({ _summary: "Prompt suggestion accepted", prompt_id: result.id });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.registerTool(
    "reject_prompt_suggestion",
    {
      title: "Reject Prompt Suggestion",
      description: "Reject a prompt suggestion.",
      inputSchema: {
        prompt_suggestion_id: z.string().min(1).describe("Prompt suggestion ID to reject"),
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ prompt_suggestion_id, project_id }, extra) => {
      try {
        requireSafeId(prompt_suggestion_id, "prompt_suggestion_id");
        await client.postRaw(
          "/prompts/suggestions/" + encodeURIComponent(prompt_suggestion_id) + "/reject",
          {},
          { project_id: requireProjectId(project_id) },
          extra.signal,
        );
        return toolResult({ _summary: "Prompt suggestion rejected" });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.registerTool(
    "accept_topic_suggestion",
    {
      title: "Accept Topic Suggestion",
      description: "Accept a topic suggestion, creating a new topic from it.",
      inputSchema: {
        topic_suggestion_id: z.string().min(1).describe("Topic suggestion ID to accept"),
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ topic_suggestion_id, project_id }, extra) => {
      try {
        requireSafeId(topic_suggestion_id, "topic_suggestion_id");
        const result = await client.postRaw<{ id: string }>(
          "/topics/suggestions/" + encodeURIComponent(topic_suggestion_id) + "/accept",
          {},
          { project_id: requireProjectId(project_id) },
          extra.signal,
        );
        return toolResult({ _summary: "Topic suggestion accepted", topic_id: result.id });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.registerTool(
    "reject_topic_suggestion",
    {
      title: "Reject Topic Suggestion",
      description: "Reject a topic suggestion.",
      inputSchema: {
        topic_suggestion_id: z.string().min(1).describe("Topic suggestion ID to reject"),
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ topic_suggestion_id, project_id }, extra) => {
      try {
        requireSafeId(topic_suggestion_id, "topic_suggestion_id");
        await client.postRaw(
          "/topics/suggestions/" + encodeURIComponent(topic_suggestion_id) + "/reject",
          {},
          { project_id: requireProjectId(project_id) },
          extra.signal,
        );
        return toolResult({ _summary: "Topic suggestion rejected" });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
