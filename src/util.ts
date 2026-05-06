import { z } from "zod";
import type { BrandReportRow, DomainReportRow, UrlReportRow } from "./types.js";

/** Server-side filter for analytics report endpoints. */
export interface ReportFilter {
  field: string;
  operator: "in" | "not_in";
  values: string[];
}

/**
 * Creates a Zod schema for server-side report filters.
 * Only allows fields valid for the specific report type.
 */
export function filterSchema(allowedFields: readonly string[]) {
  return z.array(z.object({
    field: z.enum(allowedFields as [string, ...string[]]),
    operator: z.enum(["in", "not_in"]),
    values: z.array(z.string()).min(1),
  })).describe("Server-side filters. Multiple filters are AND'd together.");
}

/**
 * Creates a Zod schema for server-side report ordering.
 * Each entry is `{ field, direction? }`. Multiple entries form a multi-key sort.
 */
export function orderBySchema(allowedFields: readonly string[]) {
  return z.array(z.object({
    field: z.enum(allowedFields as [string, ...string[]]),
    direction: z.enum(["asc", "desc"]).default("desc").optional(),
  })).describe("Sort results by one or more fields. Direction defaults to desc.");
}

/** Merges convenience shortcut parameters into a filters array. Skips shortcuts whose field already exists in filters. */
export function mergeFilters(
  filters: ReportFilter[] | undefined,
  ...shortcuts: Array<{ field: string; value: string | undefined }>
): ReportFilter[] | undefined {
  const merged: ReportFilter[] = filters ? [...filters] : [];
  const existingFields = new Set(merged.map((f) => f.field));
  for (const { field, value } of shortcuts) {
    if (value !== undefined && !existingFields.has(field)) {
      merged.push({ field, operator: "in", values: [value] });
      existingFields.add(field);
    }
  }
  return merged.length > 0 ? merged : undefined;
}

/** YYYY-MM-DD date string validated by regex and real-date check. */
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
  .refine((s) => {
    const [y, m, d] = s.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  }, "Invalid calendar date");

/**
 * Allowed breakdown dimensions for analytics reports.
 * Each adds a grouping level: prompt_id (by search prompt), model_id (by AI model),
 * tag_id (by category tag), topic_id (by topic group).
 */
export const dimensionsSchema = z
  .array(z.enum(["prompt_id", "model_id", "model_channel_id", "tag_id", "topic_id", "date", "country_code", "chat_id"]))
  .describe(
    "Breakdown dimensions. Each adds a grouping level to results: prompt_id (by search prompt), model_id (by AI model), model_channel_id (by model channel, e.g. openai-0/perplexity-0), tag_id (by category tag), topic_id (by topic group), date (by date), country_code (by country), chat_id (by individual chat). Multiple dimensions can be combined."
  );

const PROJECT_ID_PATTERN = /^or_[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/;

/**
 * Safe ID pattern — only allows alphanumeric chars, hyphens, and underscores.
 * Prevents path traversal (../) and URL injection in entity IDs used in URL paths.
 */
const SAFE_ID_PATTERN = /^[\w-]{1,200}$/;

/** Validates that an entity ID is safe for use in URL paths. Prevents path traversal attacks. */
export function requireSafeId(id: string, label: string): string {
  if (!SAFE_ID_PATTERN.test(id)) {
    const safe = id.length > 60 ? id.slice(0, 60) + "…" : id.replace(/[^\w-]/g, "?");
    throw new Error(`Invalid ${label} format: "${safe}". IDs must contain only letters, numbers, hyphens, and underscores.`);
  }
  return id;
}

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
    const safe = pid.length > 60 ? pid.slice(0, 60) + "…" : pid;
    throw new Error(
      `Invalid project_id format: "${safe}". Expected format: or_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx. Use list_projects to find valid project IDs.`
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

const DIMENSION_KEYS = ["prompt", "model", "model_channel", "tag", "topic"] as const;

const BRAND_RAW_FIELDS = new Set([
  "visibility_count",
  "visibility_total",
  "sentiment_sum",
  "sentiment_count",
  "position_sum",
  "position_count",
]);

const DEPRECATED_FIELDS = new Set([
  "usage_rate",
  "citation_avg",
  "usage_count",
  "retrievals",
]);

/**
 * Slims report rows for token-efficient MCP responses.
 * - Flattens dimension refs: `{ prompt: { id: "x" } }` → `{ prompt_id: "x" }`
 * - BrandReportRow: flattens `brand: {id, name}` → `brand_id` + `brand_name`, drops raw sum/count fields
 * - DomainReportRow: drops `classification: null`
 * - UrlReportRow: drops `title: null`
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

      // Drop deprecated fields from domain/url reports
      if (DEPRECATED_FIELDS.has(key)) continue;

      // Drop null values for classification, title
      if (value === null && (key === "classification" || key === "title")) continue;

      out[key] = value;
    }

    return out;
  });
}

// ── Summary helpers for LLM-friendly _summary fields ──

/** Summary for list endpoints: "3 projects returned" */
export function summaryForList(entity: string, items: unknown[]): string {
  const label = items.length === 1 ? entity.replace(/s$/, "") : entity;
  return `${items.length} ${label} returned`;
}

/** Summary for brand report: "5 brands, top 'BrandX' 82% visibility, 45% SoV" */
export function summaryForBrandsReport(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "0 brand rows returned";
  const top = rows.reduce((best, r) =>
    (r.visibility as number) > (best.visibility as number) ? r : best
  );
  const pct = Math.round((top.visibility as number) * 100);
  const sov = top.share_of_voice !== undefined
    ? `, ${Math.round((top.share_of_voice as number) * 100)}% SoV`
    : "";
  return `${rows.length} brand rows, top '${top.brand_name}' ${pct}% visibility${sov}`;
}

/** Summary for domain report: "12 domains, top 'example.com' 45% retrieval" */
export function summaryForDomainsReport(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "0 domain rows returned";
  const top = rows.reduce((best, r) =>
    (r.retrieval_rate as number) > (best.retrieval_rate as number) ? r : best
  );
  const pct = Math.round((top.retrieval_rate as number) * 100);
  return `${rows.length} domain rows, top '${top.domain}' ${pct}% retrieval`;
}

/** Summary for URL report: "8 URLs, top 'example.com/page' 15 citations" */
export function summaryForUrlsReport(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "0 URL rows returned";
  const top = rows.reduce((best, r) =>
    (r.citation_count as number) > (best.citation_count as number) ? r : best
  );
  return `${rows.length} URL rows, top '${top.url}' ${top.citation_count} citations`;
}

/** Formats a successful MCP tool response with compact JSON and structured content. */
export function toolResult(data: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
    structuredContent: data,
  };
}

/**
 * Formats an MCP tool error response.
 * Uses `e.message` instead of `String(e)` to avoid exposing stack traces.
 */
export function toolError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}
