<p align="center">
  <h1 align="center">Peec AI MCP Server</h1>
  <p align="center">
    Community-built MCP server for the <a href="https://peec.ai">Peec AI</a> API — AI Search Analytics for brand visibility, sentiment, and citations across ChatGPT, Perplexity, and other AI models.
  </p>
</p>

<p align="center">
  <a href="https://github.com/thein-art/mcp-server-peecai/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/thein-art/mcp-server-peecai/ci.yml?branch=main&style=flat-square&label=CI" alt="CI"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen?style=flat-square&logo=node.js&logoColor=white" alt="Node.js >= 22">
  <img src="https://img.shields.io/badge/MCP-2025--11--25-0098FF?style=flat-square" alt="MCP 2025-11-25">
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/thein-art/mcp-server-peecai?style=flat-square" alt="License"></a>
  <a href="https://www.npmjs.com/package/mcp-server-peecai"><img src="https://img.shields.io/npm/v/mcp-server-peecai?style=flat-square" alt="npm"></a>
  <a href="https://www.npmjs.com/package/mcp-server-peecai"><img src="https://img.shields.io/npm/dm/mcp-server-peecai?style=flat-square" alt="Downloads"></a>
</p>

> **Note:** This is an unofficial community project, not affiliated with or endorsed by Peec AI. It requires a [Peec AI](https://peec.ai) account and API key.

> **API Beta:** The Peec AI API is currently in beta — endpoints, payloads, and responses may change. Access is limited to Enterprise customers.

---

## What it does

Peec AI tracks how brands appear in AI-generated answers. This MCP server gives any MCP-compatible client direct access to that data — 31 tools covering projects, brands, prompts, chats, query analysis, analytics reports, and full CRUD operations.

**Key capabilities:**
- Query brand visibility, sentiment, and position across AI models
- Analyze which domains and URLs get cited in AI responses
- Inspect individual chat interactions with full source attribution
- Slice data by model, prompt, category tag, topic, country, or date
- Create, update, and delete brands, prompts, tags, and topics (opt-in)
- Review and act on AI-generated prompt and topic suggestions

## Quick Start

### 1. Get your API key

Sign up at [app.peec.ai](https://app.peec.ai) and create an API key under **Settings > API Keys**.

### 2. Configure

<details open>
<summary><strong>Claude Code</strong></summary>

```bash
claude mcp add --transport stdio peecai -- npx -y mcp-server-peecai
```

Set environment variables:

```bash
export PEECAI_API_KEY="your-api-key"
export PEECAI_PROJECT_ID="your-project-id"  # optional default
```

</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "peecai": {
      "command": "npx",
      "args": ["-y", "mcp-server-peecai"],
      "env": {
        "PEECAI_API_KEY": "your-api-key",
        "PEECAI_PROJECT_ID": "your-project-id"
      }
    }
  }
}
```

</details>

<details>
<summary><strong>VS Code / Cursor</strong></summary>

Add to `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "peecai": {
      "command": "npx",
      "args": ["-y", "mcp-server-peecai"],
      "env": {
        "PEECAI_API_KEY": "your-api-key",
        "PEECAI_PROJECT_ID": "your-project-id"
      }
    }
  }
}
```

</details>

### 3. Verify

Confirm the `peecai` server is connected — in Claude Code run `/mcp`, in VS Code/Cursor check the MCP server status in the output panel.

## Tools

### Data Retrieval (15 tools)

**`list_projects`** — List all projects for the company.
- Returns: project IDs, names, statuses (`CUSTOMER` = active, `PITCH` = demo)
- Parameters: `limit`, `offset`

**`list_brands`** — List tracked brands with their associated domains.
- Parameters: `project_id`, `limit`, `offset`

**`list_prompts`** — List monitored search prompts.
- Returns: prompt messages, tags, topics, user location, search volume
- Parameters: `project_id`, `topic_id`, `tag_id`, `limit`, `offset`

**`list_tags`** — List category tags for a project.
- Parameters: `project_id`, `limit`, `offset`

**`list_topics`** — List topic groupings for a project.
- Parameters: `project_id`, `limit`, `offset`

**`list_models`** — List tracked AI models (ChatGPT, Perplexity, etc.).
- Returns: model IDs and active status
- Parameters: `project_id`, `limit`, `offset`

**`list_chats`** — List AI chat interactions with optional date and dimension filtering.
- Returns: chat IDs, prompt/model refs, dates
- Parameters: `project_id`, `start_date`, `end_date`, `brand_id`, `prompt_id`, `model_id`, `limit`, `offset`

**`get_chat_content`** — Get full content of a specific chat.
- Returns: sources (URLs, domains, citation counts), brands mentioned, messages, queries, products
- Parameters: `chat_id`, `project_id`

**`list_prompt_suggestions`** — List AI-generated prompt suggestions.
- Parameters: `project_id`, `topic_id`, `limit`, `offset`

**`list_topic_suggestions`** — List AI-generated topic suggestions.
- Parameters: `project_id`, `limit`, `offset`

### Analytics Reports

All report tools support `dimensions` for multi-level breakdowns: `prompt_id`, `model_id`, `tag_id`, `topic_id`, `date`, `country_code`. Date filtering via `start_date` / `end_date` (YYYY-MM-DD). Server-side filtering via `filters` parameter (`field`, `operator: "in" | "not_in"`, `values`).

**`get_brands_report`** — Brand analytics per brand.

| Metric | Description |
|--------|-------------|
| `visibility` | Ratio 0–1 (visibility_count / visibility_total) |
| `sentiment` | Score 0–100, 50 = neutral |
| `position` | Average rank when mentioned, lower = better |
| `share_of_voice` | Share of voice 0–1 (proportion of total mentions) |
| `mention_count` | Number of times the brand was mentioned |

**`get_domains_report`** — Domain-level analytics.

| Metric | Description |
|--------|-------------|
| `retrieval_rate` | Share of chats retrieving this domain (0–1) |
| `citation_rate` | Average citations per retrieval |
| `classification` | `OWN`, `CORPORATE`, `COMPETITOR`, `EDITORIAL`, `REFERENCE`, `INSTITUTIONAL`, `UGC`, `OTHER` |

**`get_urls_report`** — URL-level analytics.

| Metric | Description |
|--------|-------------|
| `retrievals` | Number of chats retrieving this URL |
| `citation_count` | Total citations across all chats |
| `citation_rate` | Average citations per retrieval |
| `classification` | `HOMEPAGE`, `PRODUCT_PAGE`, `CATEGORY_PAGE`, `LISTICLE`, `COMPARISON`, `ARTICLE`, `HOW_TO_GUIDE`, `PROFILE`, `ALTERNATIVE`, `DISCUSSION`, `OTHER` |

### Query Analysis

**`search_queries`** — Get search queries AI models generated when answering prompts.
- Parameters: `project_id`, `start_date`, `end_date`, `filters`, `limit`, `offset`

**`shopping_queries`** — Get shopping/product queries AI models generated.
- Parameters: `project_id`, `start_date`, `end_date`, `filters`, `limit`, `offset`

### Write Operations (16 tools, opt-in)

Write tools are **disabled by default** for safety. Enable them by setting `PEECAI_ALLOW_WRITES=true`.

When disabled, these tools are completely invisible — they don't appear in `tools/list` and cannot be called by any client.

| Entity | Create | Update | Delete |
|--------|--------|--------|--------|
| Brands | `create_brand` | `update_brand` | `delete_brand` |
| Prompts | `create_prompt` | `update_prompt` | `delete_prompt` |
| Tags | `create_tag` | `update_tag` | `delete_tag` |
| Topics | `create_topic` | `update_topic` | `delete_topic` |

| Suggestions | Accept | Reject |
|-------------|--------|--------|
| Prompt suggestions | `accept_prompt_suggestion` | `reject_prompt_suggestion` |
| Topic suggestions | `accept_topic_suggestion` | `reject_topic_suggestion` |

Delete operations are soft-deletes and **irreversible through the API**. Delete tools carry `destructiveHint: true` in their MCP annotations, causing clients like Claude Code to require explicit user approval before execution.

### Tool Annotations

| Tool type | Read-only | Idempotent | Destructive |
|-----------|:---------:|:----------:|:-----------:|
| All read tools (15) | Yes | Yes | No |
| Create (4) | No | No | No |
| Update (4) | No | Yes | No |
| Delete (4) | No | Yes | **Yes** |
| Accept suggestion (2) | No | No | No |
| Reject suggestion (2) | No | Yes | No |

## Resources

MCP resources provide reference data that clients can fetch without a tool call.

| Resource | Type | Description |
|----------|------|-------------|
| `peecai://projects` | Static | List all projects |
| `peecai://projects/{project_id}/brands` | Template | Brands for a project |
| `peecai://projects/{project_id}/tags` | Template | Tags for a project |
| `peecai://projects/{project_id}/topics` | Template | Topics for a project |
| `peecai://projects/{project_id}/models` | Template | AI models for a project |
| `peecai://projects/{project_id}/prompts` | Template | Prompts for a project |

Resource templates support listing — clients can enumerate available resources across all projects.

## Prompt Templates

Guided analytical workflows available as MCP prompts. All prompts support `project_id` autocompletion.

| Prompt | Description |
|--------|-------------|
| `brand-visibility-analysis` | Analyze brand visibility, sentiment, and position across AI models |
| `competitive-gap-analysis` | Compare own brand vs competitors across prompts and models |
| `ai-search-citation-report` | Analyze domain and URL citations in AI responses |

## Example Prompts

```
"List my Peec AI projects"
"Show brand visibility for the last 30 days"
"Which domains get cited most in AI search results?"
"Compare brand sentiment across ChatGPT and Perplexity"
"Show me the full chat content for chat ID abc-123"
"Get URL report broken down by AI model and country"
"What search queries do AI models use when answering my prompts?"
"Create a brand 'My Brand' with domain mybrand.com"
"Add a new prompt: 'best CRM software 2025' for country DE"
```

## Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `PEECAI_API_KEY` | Yes | API key from [app.peec.ai](https://app.peec.ai/api-keys) |
| `PEECAI_PROJECT_ID` | No | Default project ID — saves repeating it in every tool call |
| `PEECAI_ALLOW_WRITES` | No | Set to `true` to enable write operations (create/update/delete). Disabled by default for safety. |

## MCP Protocol Features

This server implements the MCP 2025-11-25 specification:

- **Structured content** — list tools return `structuredContent` alongside text for type-safe client parsing
- **Tool annotations** — `readOnlyHint`, `destructiveHint`, `idempotentHint` on every tool
- **Progress notifications** — report tools send progress updates when the client provides a `progressToken`
- **Structured logging** — API errors are sent as MCP log notifications with endpoint, status, and message context
- **Prompt completions** — `project_id` argument supports autocompletion via `completable()`
- **Resource templates** — with `list` callbacks for enumerating resources across projects
- **Cancellation support** — all tools forward the MCP `AbortSignal` to API calls

## API Drift Detection

The Peec AI API is in beta and may change. A drift detection script compares the live OpenAPI spec against a committed snapshot:

```bash
npm run check:api-drift
```

- **No drift**: exit code 0, snapshot is current
- **Drift detected**: exit code 1, shows a diff of changes

No API key is required — the OpenAPI spec is publicly accessible.

## Development

### Prerequisites

- Node.js >= 22
- npm

### Commands

```bash
npm install              # Install dependencies
npm run build            # Compile TypeScript to dist/
npm run dev              # Watch mode — recompile on changes
npm test                 # Run unit tests (358 tests)
npm run test:watch       # Run tests in watch mode
npm run test:integration # Run integration tests (requires PEECAI_API_KEY)
npm run check:api-drift  # Check for API spec changes
```

### Integration Tests

Integration tests hit the live Peec AI API and are skipped by default in `npm test`.

```bash
# Read-only smoke test (all 15 read tools + prompts + resources)
PEECAI_API_KEY=xxx npm run test:integration

# Full CRUD round-trip (requires a test project + write access)
PEECAI_ALLOW_WRITES=true PEECAI_TEST_PROJECT_ID=or_xxx npm run test:integration
```

### Project Structure

```
src/
├── index.ts              # Server entry point, tool/resource/prompt registration
├── api-client.ts         # HTTP client for Peec AI Customer API
├── types.ts              # TypeScript interfaces for API responses
├── schemas.ts            # Zod output schemas for structured content
├── util.ts               # Validation, date handling, MCP response helpers
├── prompts.ts            # MCP prompt templates (guided workflows)
└── tools/                # One file per MCP tool (or tool group)
    ├── projects.ts       # list_projects
    ├── brands.ts         # list_brands
    ├── prompts.ts        # list_prompts
    ├── tags.ts           # list_tags
    ├── topics.ts         # list_topics
    ├── models.ts         # list_models
    ├── chats.ts          # list_chats
    ├── chat-content.ts   # get_chat_content
    ├── prompt-suggestions.ts  # list_prompt_suggestions
    ├── topic-suggestions.ts   # list_topic_suggestions
    ├── report-brands.ts  # get_brands_report
    ├── report-domains.ts # get_domains_report
    ├── report-urls.ts    # get_urls_report
    ├── queries-search.ts # search_queries
    ├── queries-shopping.ts    # shopping_queries
    ├── write-brands.ts   # create/update/delete brand
    ├── write-prompts.ts  # create/update/delete prompt
    ├── write-tags.ts     # create/update/delete tag
    ├── write-topics.ts   # create/update/delete topic
    └── suggestion-actions.ts  # accept/reject suggestions
```

## License

[MIT](./LICENSE)

---

Built by [Tobias Hein](https://github.com/thein-art) at [artaxo](https://artaxo.com) — a digital marketing agency specializing in AI Search Optimization.
