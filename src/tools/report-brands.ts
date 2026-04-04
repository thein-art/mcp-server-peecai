import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PeecApiClient } from "../api-client.js";
import { requireProjectId, dateSchema, dimensionsSchema, filterSchema, mergeFilters, validateDateRange, slimReportRows, summaryForBrandsReport, toolResult, toolError } from "../util.js";
import type { BrandReportRow } from "../types.js";

const BRANDS_FILTER_FIELDS = ["model_id", "tag_id", "topic_id", "prompt_id", "brand_id", "country_code"] as const;

/** Registers the get_brands_report tool for brand visibility, sentiment, and position analytics. */
export function registerBrandsReportTool(server: McpServer, client: PeecApiClient) {
  server.registerTool(
    "get_brands_report",
    {
      title: "Brand Visibility Report",
      description: "Get brand analytics report per brand. Metrics: visibility (visibility_count/visibility_total), share_of_voice (0-1), mention_count, sentiment (0-100 scale, 50=neutral), position (avg rank when mentioned, lower=better). Returns up to limit results (default: 100). Use brand_id shortcut or filters array for server-side filtering. Supports date filtering and dimensional breakdowns. Without date filters, returns data across all available dates. Empty results may indicate the project has no report data for the given time range or filters — try a broader date range or fewer filters.",
      inputSchema: {
        project_id: z.string().min(1).describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
        start_date: dateSchema.describe("Start date (YYYY-MM-DD). Omit for no lower bound.").optional(),
        end_date: dateSchema.describe("End date (YYYY-MM-DD). Omit for no upper bound.").optional(),
        dimensions: dimensionsSchema.optional(),
        brand_id: z.string()
          .describe("Convenience filter for a single brand (converted to server-side filter). Use list_brands to find IDs.")
          .optional(),
        filters: filterSchema(BRANDS_FILTER_FIELDS).optional(),
        limit: z.number().min(1).max(10000).default(100).describe("Max results (1-10000, default: 100)"),
        offset: z.number().min(0).default(0).describe("Results to skip"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ project_id, start_date, end_date, dimensions, brand_id, filters, limit, offset }, extra) => {
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

        const merged = mergeFilters(filters, { field: "brand_id", value: brand_id });
        if (merged) body.filters = merged;

        if (extra._meta?.progressToken !== undefined) {
          await extra.sendNotification({ method: "notifications/progress", params: { progressToken: extra._meta.progressToken, progress: 0, total: 2, message: "Fetching brand report..." } });
        }

        const data = await client.post<BrandReportRow[]>("/reports/brands", body, undefined, extra.signal);

        if (extra._meta?.progressToken !== undefined) {
          await extra.sendNotification({ method: "notifications/progress", params: { progressToken: extra._meta.progressToken, progress: 1, total: 2, message: "Processing results..." } });
        }
        const rows = slimReportRows(data);
        return toolResult({ _summary: summaryForBrandsReport(rows), rows });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
