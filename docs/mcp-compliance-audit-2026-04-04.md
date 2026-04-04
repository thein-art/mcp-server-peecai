# MCP Specification Compliance Audit Report

**Project**: Peec AI MCP Server (mcp-server-peecai v0.2.0)  
**SDK Version**: @modelcontextprotocol/sdk 1.27.1  
**Protocol Version**: 2025-11-25  
**Transport**: STDIO  
**Audit Date**: 2026-04-04  

---

## Executive Summary

**Overall Compliance Score: 91%** (41/45 applicable MUST/SHOULD items pass)

### Critical Non-Compliance Issues (MUST violations)
None. All MUST requirements are met (the SDK handles most protocol-level MUST requirements automatically).

### Top 5 Optimization Opportunities (ranked by impact)

1. **Sampling** (not implemented) — would enable agentic multi-step analytics workflows
2. **Cancellation support** — `extra.signal` not checked in any handler; long-running reports can't be aborted
3. **Elicitation** (not implemented) — could confirm destructive operations, collect date ranges interactively
4. **`logging/setLevel` compliance** — SDK auto-handles filtering, but server only logs at "error" level; add info/debug logging throughout
5. **`outputSchema` on remaining tools** — report tools and query tools lack it

---

## Detailed Findings

### 1. BASE PROTOCOL & JSON-RPC 2.0

| Item | Status | Notes |
|------|--------|-------|
| JSON-RPC 2.0 format | ✅ | SDK handles automatically via `Protocol` class |
| Request IDs (string/integer, never null/float) | ✅ | SDK auto-increments integer IDs |
| Responses: result XOR error | ✅ | SDK enforces this in `_onresponse()` |
| Standard error codes (-32700...-32603) | ✅ | SDK maps all codes in `ErrorCode` enum |
| Application errors outside reserved range | ✅ | Server uses `toolError()` which returns `isError: true` in content, not protocol errors |
| Notifications have no `id` | ✅ | SDK strips `id` from notifications |
| Unknown methods return -32601 | ✅ | SDK auto-returns in `_onrequest()` |
| `_meta` property handling | ✅ | Used correctly for `progressToken`; no custom `_meta` keys used |

### 2. LIFECYCLE & INITIALIZATION

| Item | Status | Notes |
|------|--------|-------|
| Server responds to `initialize` | ✅ | SDK auto-handler in `Server` constructor |
| `protocolVersion` negotiation | ✅ | SDK handles version negotiation |
| Capabilities declared | ⚠️ PARTIAL | Only `logging: {}` declared. Missing: `tools: {}` (auto-inferred by SDK when tools registered) |
| No requests before `initialized` | ✅ | SDK enforces this |
| `serverInfo` includes `name` + `version` | ✅ | `{ name: "peecai", version }` from package.json |
| `serverInfo` optional fields (title, description, icons, websiteUrl) | 🔲 OPTIONAL | Not provided. `title` and `websiteUrl` would improve discoverability |
| `instructions` field | ✅ | Comprehensive multi-section instructions covering workflow, reports, pagination, write tools |
| `listChanged` declared | 🔲 OPTIONAL | Not declared for tools/resources/prompts. Server doesn't dynamically change these after init (write tools are gated at startup, not toggled) |
| Version negotiation graceful | ✅ | SDK handles this |

### 3. STDIO TRANSPORT

| Item | Status | Notes |
|------|--------|-------|
| Reads stdin, writes stdout | ✅ | `StdioServerTransport` handles this |
| No non-MCP content on stdout | ✅ | Only `console.error()` used (4 places in index.ts). Zero `console.log/warn/info` calls |
| Stderr for logging | ✅ | `console.error()` for startup, shutdown, fatal errors |
| Newline-delimited messages | ✅ | SDK's `serializeMessage()` appends `\n` |
| Graceful EOF handling | ✅ | SIGINT/SIGTERM handlers with 5s timeout fallback |
| No partial/malformed JSON on stdout | ✅ | SDK serializes complete JSON messages |

### 4. TOOLS

| Item | Status | Notes |
|------|--------|-------|
| `tools/list` returns name, description, inputSchema | ✅ | All 31 tools have these fields |
| Tool names follow spec guidance | ✅ | `a-z`, `0-9`, `_` only; all under 64 chars; e.g. `list_brands`, `get_brands_report` |
| `inputSchema` is valid JSON Schema | ✅ | Zod schemas auto-converted by SDK |
| `tools/call` returns `CallToolResult` with `content` array | ✅ | All handlers return via `toolResult()` or `toolError()` |
| Content types correct | ✅ | All use `TextContent` (`type: "text"`) |
| `isError: true` on business logic errors | ✅ | `toolError()` sets `isError: true` consistently |
| Input validation errors as tool errors | ✅ | `requireProjectId()` throws which gets caught and returned as `isError: true` |
| `structuredContent` alongside `content` if outputSchema defined | ✅ | `toolResult()` returns both `content` and `structuredContent` |
| `outputSchema` conformance | ⚠️ PARTIAL | 10/15 read tools have outputSchema. Missing: 3 report tools, 2 query tools. Write tools return simple results (no schema needed). **Spec says if outputSchema declared, structuredContent MUST conform** — conformance is ensured since `toolResult(data)` sets both from same source |
| Tool annotations present and accurate | ✅ | All 31 tools have `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`. Annotations match operation semantics (deletes have `destructiveHint: true`, creates have `idempotentHint: false`, etc.) |
| `title` on tools | ✅ | All 31 tools have human-friendly `title` field |
| `icons` on tools | 🔲 OPTIONAL | Not provided. Low priority |
| `notifications/tools/list_changed` | 🔲 NOT APPLICABLE | `listChanged` not declared; tool set is static per session |

### 5. RESOURCES

| Item | Status | Notes |
|------|--------|-------|
| `resources/list` returns uri, name, description, mimeType | ✅ | Static "projects" resource + 5 templates with list callbacks |
| `resources/read` returns content | ✅ | All resources return `{ contents: [{ uri, mimeType, text }] }` |
| URIs follow RFC 3986 | ✅ | Custom scheme: `peecai://projects`, `peecai://projects/{project_id}/brands` |
| Resource templates use RFC 6570 | ✅ | `peecai://projects/{project_id}/brands` is valid Level 1 URI template |
| Resource subscriptions | 🔲 NOT IMPLEMENTED | `subscribe: true` not declared. Resources are API-backed and change server-side, so subscriptions wouldn't add much value |
| `notifications/resources/list_changed` | 🔲 NOT APPLICABLE | `listChanged` not declared |
| Resource annotations (audience, priority) | 🔲 OPTIONAL | Not used. Could add `audience: ["assistant"]` for dimension lookups, `priority` for ordering |
| Resource `title` | ✅ | All resources have `title` field |
| `icons` on resources | 🔲 OPTIONAL | Not provided |

### 6. PROMPTS

| Item | Status | Notes |
|------|--------|-------|
| `prompts/list` returns name, description, arguments | ✅ | 3 prompts with title, description, argsSchema |
| `prompts/get` returns messages array | ✅ | All prompts return `{ messages: [...] }` with role/content |
| Argument names, descriptions, required correct | ✅ | project_id (optional, completable), period (enum with default) |
| `notifications/prompts/list_changed` | 🔲 NOT APPLICABLE | Prompts are static |
| `icons` on prompts | 🔲 OPTIONAL | Not provided |

### 7. SAMPLING

| Item | Status | Notes |
|------|--------|-------|
| Server uses `sampling/createMessage` | 🔲 NOT IMPLEMENTED | **High-priority optimization** |

**Sampling would unlock these concrete use cases:**

1. **Automated brand audit**: Server fetches brand report, samples LLM to analyze trends, then drills down into specific brands automatically — a multi-step workflow in one user request
2. **Smart alert triage**: When visibility drops detected, server samples LLM to determine severity and recommend actions based on historical data
3. **Natural language report generation**: Server fetches raw analytics data, then uses sampling to generate a formatted executive summary with insights
4. **Anomaly investigation**: Server detects unusual metrics, uses sampling to reason about possible causes by cross-referencing brand, domain, and URL reports
5. **Guided project setup**: After creating a new project, server uses sampling to suggest brands, prompts, and topics based on the project name/domain

**Most impactful scenario — automated multi-step brand audit:**

```typescript
// Pseudocode for agentic brand audit via sampling
async function brandAudit(projectId, extra) {
  // Step 1: Gather data
  const brands = await client.get("/brands", { project_id: projectId });
  const report = await client.post("/reports/brands", { project_id: projectId, ... });

  // Step 2: Ask LLM to analyze
  const analysis = await server.createMessage({
    messages: [{
      role: "user",
      content: { type: "text", text: `Analyze brand visibility: ${JSON.stringify(report)}. Which brands need attention?` }
    }],
    maxTokens: 1024,
    modelPreferences: { intelligencePriority: 0.8, speedPriority: 0.5 }
  });

  // Step 3: Based on analysis, drill into specific brands
  const flaggedBrands = extractBrandIds(analysis.content);
  const details = await Promise.all(
    flaggedBrands.map(id => client.post("/reports/brands", {
      project_id: projectId, filters: [{ field: "brand_id", operator: "in", values: [id] }],
      dimensions: ["model_id", "date"]
    }))
  );

  // Step 4: Generate final recommendations
  const recommendations = await server.createMessage({
    messages: [
      { role: "user", content: { type: "text", text: `Detailed data: ${JSON.stringify(details)}` } },
      { role: "user", content: { type: "text", text: "Generate actionable recommendations for each flagged brand." } }
    ],
    maxTokens: 2048
  });

  return toolResult({ _summary: "Brand audit complete", analysis: recommendations.content });
}
```

### 8. LOGGING

| Item | Status | Notes |
|------|--------|-------|
| Declares `logging` capability | ✅ | `capabilities: { logging: {} }` in McpServer constructor |
| Sends `notifications/message` with structured data | ✅ | `server.sendLoggingMessage({ level, logger, data })` called on API errors |
| Log entries include level, logger, data | ✅ | `level: "error"`, `logger: "peecai-api"`, `data: { endpoint, method, status, message }` |
| Log levels follow spec hierarchy | ✅ | Uses "error" level. SDK auto-filters via severity map |
| Respects `logging/setLevel` | ✅ | SDK auto-handles in server `logging/setLevel` handler; filters in `sendLoggingMessage()` |
| Logger field meaningful | ⚠️ PARTIAL | Only one logger: `"peecai-api"`. Could differentiate per tool/subsystem |
| Data field is structured JSON | ✅ | `{ endpoint, method, status, message }` — proper object, not string |
| Proactive logging | ⚠️ PARTIAL | Only logs on API errors. No info/debug logging for tool execution, progress, startup events |

**Recommended logging strategy:**

| Log Point | Level | Logger | Data |
|-----------|-------|--------|------|
| Tool invoked | `debug` | `peecai-tool` | `{ tool, params }` |
| Tool completed | `info` | `peecai-tool` | `{ tool, duration_ms, result_size }` |
| API request sent | `debug` | `peecai-api` | `{ method, endpoint }` |
| API error | `error` | `peecai-api` | `{ endpoint, method, status, message }` (already done) |
| API slow response (>5s) | `warning` | `peecai-api` | `{ endpoint, duration_ms }` |
| Write tool executed | `notice` | `peecai-write` | `{ tool, entity_id }` |
| Server startup | `info` | `peecai-server` | `{ version, write_mode, project_id_configured }` |
| Progress sent | `debug` | `peecai-progress` | `{ tool, progress, total }` |

### 9. ELICITATION

| Item | Status | Notes |
|------|--------|-------|
| Server uses `elicitation/create` | 🔲 NOT IMPLEMENTED | |

**Potential use cases:**
- Confirm delete operations before executing (even with `destructiveHint`, an explicit "Are you sure?" would be safer)
- Ask user for date range interactively when running reports without date params
- Disambiguate project_id when multiple projects exist and none is set as default
- Collect API key if `PEECAI_API_KEY` is missing (instead of exiting)

### 10. ROOTS

| Item | Status | Notes |
|------|--------|-------|
| Server uses `roots/list` | 🔲 NOT IMPLEMENTED | |
| Benefit assessment | 💡 LOW | This server is API-backed, not filesystem-backed. Roots provide workspace context which has minimal relevance here |

### 11. TASKS (Experimental)

| Item | Status | Notes |
|------|--------|-------|
| Declares `tasks` capability | 🔲 NOT IMPLEMENTED | |
| Benefit assessment | 💡 MEDIUM | Report tools and query tools make API calls that can take seconds. Task-based execution would allow clients to poll status and cancel. Currently report tools block until complete (with progress notifications, which is good). |

### 12. UTILITIES

| Item | Status | Notes |
|------|--------|-------|
| Progress tracking | ✅ | 3 report tools send `notifications/progress` with token, progress (0/2, 1/2), total, and message |
| Cancellation handling | ⚠️ PARTIAL | SDK provides `extra.signal` (AbortSignal) in every handler, but **no handler checks it**. Long-running API calls (30s timeout) cannot be aborted mid-flight. Spec Section 5.2.5: "Servers SHOULD check for cancellation" |
| Ping | ✅ | SDK auto-responds |
| Completion/autocomplete | ✅ | `completable()` used on prompt argsSchema for project_id. Fetches project list for suggestions. Resource template completion not implemented but SDK handles variable extraction |

### 13. SECURITY & TRUST

| Item | Status | Notes |
|------|--------|-------|
| Tool descriptions treated as untrusted | ✅ | N/A for server-side (this is a client concern) |
| No sensitive data in errors | ✅ | `toolError()` uses `e.message` not `String(e)` — no stack traces. API errors truncated to 500 chars |
| Input validation on all params | ✅ | Zod schemas validate all inputs. `requireProjectId()` validates format with regex. `validateDateRange()` validates date ordering. SDK rejects invalid params with -32602 |
| Resource access scoped | ✅ | No filesystem access. All resources are API-backed with project-scoped access |
| Env vars not exposed | ✅ | `PEECAI_API_KEY` never included in tool outputs, errors, or logs. API key is sent only in request headers |

### 14. FORWARD COMPATIBILITY

| Item | Status | Notes |
|------|--------|-------|
| Ignores unknown fields | ✅ | SDK's Zod schemas allow passthrough on params objects |
| Extension naming convention | ✅ | No custom extensions declared |
| Handles malformed JSON | ✅ | SDK returns -32700 ParseError |
| Handles unknown methods | ✅ | SDK returns -32601 MethodNotFound |

---

## Optimization Roadmap

### 1. Critical (MUST violations)
None.

### 2. High (SHOULD violations + missing high-value features)

**2a. Cancellation support** (`src/tools/report-*.ts`)
- Spec Section 5.2.5: "Servers SHOULD check for cancellation and stop work as soon as practical"
- Impact: Report tools with 30s API timeout cannot be cancelled
- Fix: Check `extra.signal.aborted` before and after API call, pass `extra.signal` to `fetch()`:
  ```typescript
  // In api-client.ts request():
  signal: options.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  // In report tool handler:
  const data = await client.post("/reports/brands", body, undefined, extra.signal);
  ```

**2b. Implement sampling** (new capability)
- Highest-value missing feature. Enables agentic analytics workflows.
- See Section 7 above for detailed use cases and pseudocode.

**2c. Expand logging** (`src/api-client.ts`, `src/util.ts`, tool handlers)
- Add info/debug logging for tool invocations and completions
- Add warning-level logging for slow API responses
- Add notice-level logging for write operations

### 3. Medium (valuable optional features)

**3a. Elicitation for destructive operations** (new feature)
- Confirm delete operations interactively before executing

**3b. `outputSchema` on remaining tools** (`src/tools/report-*.ts`, `src/tools/queries-*.ts`)
- Report tools have dynamic output shape (depends on dimensions), but a base schema could be defined

**3c. Task-based execution for reports** (experimental)
- Convert long-running report and query tools to async task model

**3d. `serverInfo` enrichment** (`src/index.ts`)
- Add `title: "Peec AI — AI Search Analytics"`, `websiteUrl: "https://peec.ai"`, optional `description`

### 4. Low (polish)

**4a. Tool/resource/prompt icons** — visual discoverability in clients  
**4b. Resource annotations** (`audience`, `priority`) — hint to clients which resources are for AI vs users  
**4c. `listChanged` capability** — not needed unless tool set becomes dynamic at runtime  

---

## Code-Level Recommendations

### ⚠️ Cancellation not checked in handlers

**Files**: `src/tools/report-brands.ts:30`, `src/tools/report-domains.ts:29`, `src/tools/report-urls.ts:29`, all write tool handlers  
**Currently**: Handler ignores `extra.signal` completely  
**Should**: Check signal before API call and pass to fetch  

```typescript
// api-client.ts — accept optional signal
async post<T>(path: string, body: Record<string, unknown>, params?: ..., signal?: AbortSignal): Promise<T> {
  const response = await this.request(path, { method: "POST", params, body: JSON.stringify(body),
    extraHeaders: { "Content-Type": "application/json" }, signal });
  // ...
}

// request() method — use provided signal or default timeout
signal: options.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),

// report tool handler
async ({ ... }, extra) => {
  if (extra.signal?.aborted) return toolError(new Error("Request cancelled"));
  const data = await client.post("/reports/brands", body, undefined, extra.signal);
  // ...
}
```

### ⚠️ Logging only at error level

**File**: `src/api-client.ts:75`  
**Currently**: `this.onLog?.("error", ...)` only on API failures  
**Should**: Add info/debug logging throughout  

```typescript
// Before API call:
this.onLog?.("debug", { event: "api_request", method: options.method, endpoint: path });

// After successful call:
this.onLog?.("info", { event: "api_response", endpoint: path, status: response.status, duration_ms });

// Slow response warning:
if (duration > 5000) {
  this.onLog?.("warning", { event: "slow_response", endpoint: path, duration_ms: duration });
}
```

### ⚠️ outputSchema missing on report/query tools

**Files**: `src/tools/report-brands.ts`, `report-domains.ts`, `report-urls.ts`, `queries-search.ts`, `queries-shopping.ts`  
**Currently**: No `outputSchema` defined  
**Should**: Define base schema for the common `{ _summary, rows }` shape  

```typescript
// schemas.ts
export const reportRowsOutput = {
  _summary: z.string(),
  rows: z.array(z.record(z.unknown())),
};
```

### 💡 serverInfo enrichment

**File**: `src/index.ts:47`  
**Currently**: `{ name: "peecai", version }`  
**Could add**:
```typescript
{
  name: "peecai",
  version,
  title: "Peec AI - AI Search Analytics",
  websiteUrl: "https://github.com/thein-art/mcp-server-peecai",
}
```

### 🔲 Sampling (not implemented)

**File**: New tool or prompt enhancement  
**Potential**: Register a `brand_audit` tool that uses `server.server.createMessage()` for multi-step reasoning. Requires client to declare `sampling` capability.

### 🔲 Elicitation (not implemented)

**File**: `src/tools/write-*.ts` delete handlers  
**Potential**: Before executing delete, call `server.server.elicitInput()` to confirm:
```typescript
const confirm = await extra.sendRequest({
  method: "elicitation/create",
  params: {
    message: `Delete brand "${brandName}"? This is irreversible.`,
    requestedSchema: { type: "object", properties: { confirm: { type: "boolean" } } }
  }
});
if (confirm.action !== "accept" || !confirm.content?.confirm) {
  return toolResult({ _summary: "Delete cancelled by user" });
}
```

---

## Summary

The Peec AI MCP Server is **well-compliant** with the MCP specification. All MUST requirements are met (largely thanks to the SDK handling protocol-level concerns). The main gaps are in optional features that would enhance the experience:

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| High | Cancellation support | Low | Prevents stuck 30s API calls |
| High | Sampling integration | High | Enables agentic workflows |
| High | Expand logging | Low | Better observability |
| Medium | Elicitation for deletes | Medium | Safety improvement |
| Medium | outputSchema completeness | Low | Better client integration |
| Medium | serverInfo enrichment | Trivial | Discoverability |
| Low | Icons | Low | Visual polish |
| Low | Resource annotations | Trivial | Client hints |
