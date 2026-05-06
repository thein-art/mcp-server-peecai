import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PeecApiClient } from "../api-client.js";
import { requireProjectId, requireSafeId, toolResult, toolError } from "../util.js";

/** Registers tools for creating, updating, and deleting prompts. */
export function registerWritePromptsTools(server: McpServer, client: PeecApiClient) {
  server.registerTool(
    "create_prompt",
    {
      title: "Create Prompt",
      description: "Create a new search prompt to monitor across AI models. Requires prompt text and country code.",
      inputSchema: {
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
        text: z.string().min(1).max(700).describe("Prompt text (max 700 characters)"),
        country_code: z.string().length(2).describe("ISO 3166-1 alpha-2 country code (e.g. US, DE)"),
        topic_id: z.string().describe("Topic ID to assign").optional(),
        tag_ids: z.array(z.string()).describe("Tag IDs to assign").optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ project_id, text, country_code, topic_id, tag_ids }, extra) => {
      try {
        const body: Record<string, unknown> = { text, country_code };
        if (topic_id !== undefined) body.topic_id = topic_id;
        if (tag_ids !== undefined) body.tag_ids = tag_ids;
        const result = await client.postRaw<{ id: string }>("/prompts", body, { project_id: requireProjectId(project_id) }, extra.signal);
        return toolResult({ _summary: "Prompt created", prompt_id: result.id });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.registerTool(
    "update_prompt",
    {
      title: "Update Prompt",
      description: "Update prompt topic or tag assignments.",
      inputSchema: {
        prompt_id: z.string().min(1).describe("Prompt ID to update"),
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
        topic_id: z.string().nullable().describe("Topic ID to assign (null to remove)").optional(),
        tag_ids: z.array(z.string()).describe("Tag IDs to assign").optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ prompt_id, project_id, topic_id, tag_ids }, extra) => {
      try {
        requireSafeId(prompt_id, "prompt_id");
        const body: Record<string, unknown> = {};
        if (topic_id !== undefined) body.topic_id = topic_id;
        if (tag_ids !== undefined) body.tag_ids = tag_ids;
        await client.patchRaw("/prompts/" + encodeURIComponent(prompt_id), body, { project_id: requireProjectId(project_id) }, extra.signal);
        return toolResult({ _summary: "Prompt updated", prompt_id });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.registerTool(
    "delete_prompt",
    {
      title: "Delete Prompt",
      description: "Soft-delete a prompt and its associated chats. This action is irreversible through the API.",
      inputSchema: {
        prompt_id: z.string().min(1).describe("Prompt ID to delete"),
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ prompt_id, project_id }, extra) => {
      try {
        requireSafeId(prompt_id, "prompt_id");
        await client.delete("/prompts/" + encodeURIComponent(prompt_id), { project_id: requireProjectId(project_id) }, extra.signal);
        return toolResult({ _summary: "Prompt deleted", prompt_id });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
