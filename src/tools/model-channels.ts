import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PeecApiClient } from "../api-client.js";
import { requireProjectId, summaryForList, toolResult, toolError } from "../util.js";
import { modelChannelsOutput } from "../schemas.js";
import type { ModelChannel } from "../types.js";

/** Registers the list_model_channels tool for retrieving model channels (stable identifiers grouping one or more models). */
export function registerModelChannelsTool(server: McpServer, client: PeecApiClient) {
  server.registerTool(
    "list_model_channels",
    {
      title: "List Model Channels",
      description: "List model channels tracked by Peec AI. A model channel (e.g. openai-0, perplexity-0) is a stable identifier that groups one or more underlying models, so the channel ID remains constant even when the underlying model is rotated. Returns channel IDs, descriptions, the currently active model, and active status.",
      inputSchema: {
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
        limit: z.number().min(1).max(10000).default(1000).describe("Max results (1-10000)").optional(),
        offset: z.number().min(0).default(0).describe("Results to skip").optional(),
      },
      outputSchema: modelChannelsOutput,
      annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ project_id, limit, offset }, extra) => {
      try {
        const data = await client.get<ModelChannel[]>("/model-channels", {
          project_id: requireProjectId(project_id),
          limit,
          offset,
        }, extra.signal);
        return toolResult({ _summary: summaryForList("model channels", data), model_channels: data });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
