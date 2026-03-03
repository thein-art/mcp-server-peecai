import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PeecApiClient } from "../api-client.js";
import { requireProjectId, dateSchema, dimensionsSchema, validateDateRange, slimReportRows, toolResult, toolError } from "../util.js";
import type { DomainReportRow } from "../types.js";

/** Registers the get_domains_report tool for domain classification, usage, and citation analytics. */
export function registerDomainsReportTool(server: McpServer, client: PeecApiClient) {
  server.tool(
    "get_domains_report",
    "Get domain analytics report: usage_rate (0-1, share of chats citing this domain) and citation_avg (avg citations per chat). Classification values: OWN, CORPORATE, COMPETITOR, EDITORIAL, REFERENCE, INSTITUTIONAL, UGC, OTHER. Returns up to limit results (default: 100). Use classification filter to narrow results. Without date filters, returns data across all available dates.",
    {
      project_id: z.string().describe("Project ID (uses PEECAI_PROJECT_ID env if omitted). Call list_projects to find IDs.").optional(),
      start_date: dateSchema.describe("Start date (YYYY-MM-DD). Omit for no lower bound.").optional(),
      end_date: dateSchema.describe("End date (YYYY-MM-DD). Omit for no upper bound.").optional(),
      dimensions: dimensionsSchema.optional(),
      classification: z.enum(["OWN", "CORPORATE", "COMPETITOR", "EDITORIAL", "REFERENCE", "INSTITUTIONAL", "UGC", "OTHER"])
        .describe("Filter by domain classification.")
        .optional(),
      limit: z.number().min(1).max(10000).default(100).describe("Max results (1-10000, default: 100)").optional(),
      offset: z.number().min(0).default(0).describe("Results to skip").optional(),
    },
    async ({ project_id, start_date, end_date, dimensions, classification, limit, offset }) => {
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

        const data = await client.post<DomainReportRow[]>("/reports/domains", body);
        const filtered = classification ? data.filter(r => r.classification === classification) : data;
        return toolResult(slimReportRows(filtered));
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
