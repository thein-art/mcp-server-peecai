import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PeecApiClient } from "../api-client.js";
import { requireProjectId, dateSchema, dimensionsSchema, filterSchema, mergeFilters, validateDateRange, slimReportRows, summaryForUrlsReport, toolResult, toolError } from "../util.js";
import type { UrlReportRow } from "../types.js";

const URLS_FILTER_FIELDS = ["model_id", "tag_id", "topic_id", "prompt_id", "domain", "url"] as const;

/** Registers the get_urls_report tool for URL classification, usage, and citation analytics. */
export function registerUrlsReportTool(server: McpServer, client: PeecApiClient) {
  server.registerTool(
    "get_urls_report",
    {
      description: "Get URL analytics report: usage_count (chats citing this URL), citation_count (total citations), citation_avg (avg citations per chat). Classification values: HOMEPAGE, CATEGORY_PAGE, PRODUCT_PAGE, LISTICLE, COMPARISON, PROFILE, ALTERNATIVE, DISCUSSION, HOW_TO_GUIDE, ARTICLE, OTHER. Returns up to limit results (default: 100). Use classification shortcut or filters array for server-side filtering. Without date filters, returns data across all available dates. Empty results may indicate the project has no report data for the given time range or filters.",
      inputSchema: {
        project_id: z.string().describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
        start_date: dateSchema.describe("Start date (YYYY-MM-DD). Omit for no lower bound.").optional(),
        end_date: dateSchema.describe("End date (YYYY-MM-DD). Omit for no upper bound.").optional(),
        dimensions: dimensionsSchema.optional(),
        classification: z.enum(["HOMEPAGE", "CATEGORY_PAGE", "PRODUCT_PAGE", "LISTICLE", "COMPARISON", "PROFILE", "ALTERNATIVE", "DISCUSSION", "HOW_TO_GUIDE", "ARTICLE", "OTHER"])
          .describe("Convenience filter by URL classification (converted to server-side filter).")
          .optional(),
        filters: filterSchema(URLS_FILTER_FIELDS).optional(),
        limit: z.number().min(1).max(10000).default(100).describe("Max results (1-10000, default: 100)"),
        offset: z.number().min(0).default(0).describe("Results to skip"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ project_id, start_date, end_date, dimensions, classification, filters, limit, offset }) => {
      try {
        const dates = validateDateRange(start_date, end_date);
        const body: Record<string, unknown> = {
          project_id: requireProjectId(project_id),
        };
        if (dates.start_date) body.start_date = dates.start_date;
        if (dates.end_date) body.end_date = dates.end_date;
        if (dimensions) body.dimensions = dimensions;
        body.limit = limit;
        body.offset = offset;

        const merged = mergeFilters(filters, { field: "classification", value: classification });
        if (merged) body.filters = merged;

        const data = await client.post<UrlReportRow[]>("/reports/urls", body);
        const rows = slimReportRows(data);
        return toolResult({ _summary: summaryForUrlsReport(rows), rows });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
