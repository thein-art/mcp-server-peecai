import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PeecApiClient } from "../api-client.js";
import { requireProjectId, toolResult, toolError } from "../util.js";
import { urlContentOutput } from "../schemas.js";
import type { UrlContent } from "../types.js";

/** Registers the get_url_content tool for retrieving scraped markdown content of a source URL. */
export function registerUrlContentTool(server: McpServer, client: PeecApiClient) {
  server.registerTool(
    "get_url_content",
    {
      title: "Get URL Content",
      description: "Get the scraped markdown content of a source URL. Use the URLs report (get_urls_report) to discover URLs. Returns markdown content plus metadata (title, domain, channel_title, classification, url_classification, content_length, truncated, content_updated_at). If stored content exceeds max_length, the response is truncated and truncated=true — re-request with a larger max_length to get more. Returns 404 if the URL is not tracked by the project.",
      inputSchema: {
        url: z.string().url().describe("URL to fetch content for. Discover URLs via get_urls_report."),
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
        max_length: z.number().int().min(1).max(20_000_000).default(100_000).describe("Maximum number of characters of content to return (1-20,000,000). Default 100,000.").optional(),
      },
      outputSchema: urlContentOutput,
      annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ url, project_id, max_length }, extra) => {
      try {
        const body: Record<string, unknown> = {
          url,
          project_id: requireProjectId(project_id),
        };
        if (max_length !== undefined) body.max_length = max_length;

        const data = await client.post<UrlContent>("/sources/urls/content", body, undefined, extra.signal);
        const lenLabel = data.content === null
          ? "no content yet (scraping pending)"
          : `${data.content_length} chars${data.truncated ? " (truncated)" : ""}`;
        const _summary = `${data.url}: ${lenLabel}`;
        return toolResult({ _summary, content: data });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
