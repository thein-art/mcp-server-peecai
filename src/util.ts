import { z } from "zod";
import type { BrandReportRow, DomainReportRow, UrlReportRow } from "./types.js";

/** YYYY-MM-DD date string validated by regex. */
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");

/**
 * Allowed breakdown dimensions for analytics reports.
 * Each adds a grouping level: prompt_id (by search prompt), model_id (by AI model),
 * tag_id (by category tag), topic_id (by topic group).
 */
export const dimensionsSchema = z
  .array(z.enum(["prompt_id", "model_id", "tag_id", "topic_id"]))
  .describe(
    "Breakdown dimensions. Each adds a grouping level to results: prompt_id (by search prompt), model_id (by AI model, e.g. ChatGPT/Perplexity), tag_id (by category tag), topic_id (by topic group). Multiple dimensions can be combined."
  );

const PROJECT_ID_PATTERN = /^or_[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/;

/**
 * Resolves the project ID from an explicit parameter or the PEECAI_PROJECT_ID env var.
 * Validates format before returning to catch misconfigurations early with actionable errors.
 */
export function requireProjectId(explicit?: string): string {
  const pid = explicit || process.env.PEECAI_PROJECT_ID;
  if (!pid) {
    throw new Error(
      "Missing project_id. Either pass project_id as parameter or set PEECAI_PROJECT_ID environment variable. Use list_projects to find available project IDs."
    );
  }
  if (!PROJECT_ID_PATTERN.test(pid)) {
    throw new Error(
      `Invalid project_id format: "${pid}". Expected format: or_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx. Use list_projects to find valid project IDs.`
    );
  }
  return pid;
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Validates and normalizes a date range.
 * Caps future end_date to today and ensures start <= end.
 */
export function validateDateRange(
  startDate?: string,
  endDate?: string,
): { start_date?: string; end_date?: string } {
  const today = todayString();

  const effectiveEnd = endDate && endDate > today ? today : endDate;

  if (startDate && effectiveEnd && startDate > effectiveEnd) {
    throw new Error(
      `Invalid date range: start_date (${startDate}) is after end_date (${effectiveEnd}). start_date must be <= end_date.`
    );
  }

  return {
    start_date: startDate,
    end_date: effectiveEnd,
  };
}

const DIMENSION_KEYS = ["prompt", "model", "tag", "topic"] as const;

const BRAND_RAW_FIELDS = new Set([
  "visibility_count",
  "visibility_total",
  "sentiment_sum",
  "sentiment_count",
  "position_sum",
  "position_count",
]);

/**
 * Slims report rows for token-efficient MCP responses.
 * - Flattens dimension refs: `{ prompt: { id: "x" } }` → `{ prompt_id: "x" }`
 * - BrandReportRow: flattens `brand: {id, name}` → `brand_id` + `brand_name`, drops raw sum/count fields
 * - DomainReportRow: drops `classification: null`
 * - UrlReportRow: drops `urlNormalized: null`, `title: null`
 */
type ReportRow = BrandReportRow | DomainReportRow | UrlReportRow;

export function slimReportRows(rows: ReportRow[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
      // Flatten brand: {id, name} → brand_id, brand_name
      if (key === "brand" && value && typeof value === "object" && "id" in value) {
        const brand = value as { id: string; name: string };
        out.brand_id = brand.id;
        out.brand_name = brand.name;
        continue;
      }

      // Flatten dimension refs: prompt/model/tag/topic → *_id
      if (DIMENSION_KEYS.includes(key as (typeof DIMENSION_KEYS)[number]) && value && typeof value === "object" && "id" in value) {
        out[`${key}_id`] = (value as { id: string }).id;
        continue;
      }

      // Drop brand raw sum/count fields
      if (BRAND_RAW_FIELDS.has(key)) continue;

      // Drop null values for classification, urlNormalized, title
      if (value === null && (key === "classification" || key === "urlNormalized" || key === "title")) continue;

      out[key] = value;
    }

    return out;
  });
}

// ── Summary helpers for LLM-friendly _summary fields ──

/** Summary for list endpoints: "3 projects returned" */
export function summaryForList(entity: string, items: unknown[]): string {
  return `${items.length} ${entity} returned`;
}

/** Summary for brand report: "5 brands, top 'BrandX' 82% visibility" */
export function summaryForBrandsReport(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "0 brand rows returned";
  const top = rows.reduce((best, r) =>
    (r.visibility as number) > (best.visibility as number) ? r : best
  );
  const pct = Math.round((top.visibility as number) * 100);
  return `${rows.length} brand rows, top '${top.brand_name}' ${pct}% visibility`;
}

/** Summary for domain report: "12 domains, top 'example.com' 45% usage" */
export function summaryForDomainsReport(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "0 domain rows returned";
  const top = rows.reduce((best, r) =>
    ((r.usage_rate as number) ?? 0) > ((best.usage_rate as number) ?? 0) ? r : best
  );
  const pct = Math.round(((top.usage_rate as number) ?? 0) * 100);
  return `${rows.length} domain rows, top '${top.domain}' ${pct}% usage`;
}

/** Summary for URL report: "8 URLs, top 'example.com/page' 15 citations" */
export function summaryForUrlsReport(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "0 URL rows returned";
  const top = rows.reduce((best, r) =>
    (r.citation_count as number) > (best.citation_count as number) ? r : best
  );
  return `${rows.length} URL rows, top '${top.url}' ${top.citation_count} citations`;
}

/** Formats a successful MCP tool response with compact JSON to minimize token usage. */
export function toolResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
  };
}

/**
 * Formats an MCP tool error response.
 * Uses `e.message` instead of `String(e)` to avoid exposing stack traces.
 */
export function toolError(e: unknown) {
  const message = e instanceof Error ? e.message : "Unknown error";
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}
