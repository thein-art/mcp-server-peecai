import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PeecApiClient } from "../api-client.js";
import { requireProjectId, dateSchema, dimensionsSchema, validateDateRange, slimReportRows, summaryForBrandsReport, toolResult, toolError } from "../util.js";
import type { BrandReportRow } from "../types.js";

/** Registers the get_brands_report tool for brand visibility, sentiment, and position analytics. */
export function registerBrandsReportTool(server: McpServer, client: PeecApiClient) {
  server.tool(
    "get_brands_report",
    "Get brand analytics report per brand. Metrics: visibility (visibility_count/visibility_total), sentiment (0-100 scale, 50=neutral), position (avg rank when mentioned, lower=better). Returns up to limit results (default: 100). Use brand_id to filter for a single brand. Supports date filtering and dimensional breakdowns. Without date filters, returns data across all available dates.",
    {
      project_id: z.string().describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
      start_date: dateSchema.describe("Start date (YYYY-MM-DD). Omit for no lower bound.").optional(),
      end_date: dateSchema.describe("End date (YYYY-MM-DD). Omit for no upper bound.").optional(),
      dimensions: dimensionsSchema.optional(),
      brand_id: z.string()
        .describe("Filter to a specific brand. Use list_brands to find IDs.")
        .optional(),
      limit: z.number().min(1).max(10000).default(100).describe("Max results (1-10000, default: 100)").optional(),
      offset: z.number().min(0).default(0).describe("Results to skip").optional(),
    },
    async ({ project_id, start_date, end_date, dimensions, brand_id, limit, offset }) => {
      try {
        const dates = validateDateRange(start_date, end_date);
        const body: Record<string, unknown> = {
          project_id: requireProjectId(project_id),
        };
        if (dates.start_date) body.start_date = dates.start_date;
        if (dates.end_date) body.end_date = dates.end_date;
        if (dimensions) body.dimensions = dimensions;
        if (limit !== undefined) body.limit = limit;
        if (offset !== undefined) body.offset = offset;

        const data = await client.post<BrandReportRow[]>("/reports/brands", body);
        const filtered = brand_id ? data.filter(r => r.brand.id === brand_id) : data;
        const rows = slimReportRows(filtered);
        return toolResult({ _summary: summaryForBrandsReport(rows), rows });
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
