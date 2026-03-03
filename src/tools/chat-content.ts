import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PeecApiClient } from "../api-client.js";
import { requireProjectId, toolResult, toolError } from "../util.js";
import type { ChatContent } from "../types.js";

/** Registers the get_chat_content tool for retrieving full chat details. */
export function registerChatContentTool(server: McpServer, client: PeecApiClient) {
  server.tool(
    "get_chat_content",
    "Get full content of a specific AI chat. Returns sources, brands mentioned, messages, queries, and products.",
    {
      chat_id: z.string().regex(/^[\w-]+$/, "Invalid chat_id format").describe("Chat ID to retrieve"),
      project_id: z.string().describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
    },
    async ({ chat_id, project_id }) => {
      try {
        const data = await client.getRaw<ChatContent>(`/chats/${chat_id}/content`, {
          project_id: requireProjectId(project_id),
        });
        return toolResult(data);
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
