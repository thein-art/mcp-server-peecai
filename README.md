<p align="center">
  <h1 align="center">Peec AI MCP Server</h1>
  <p align="center">
    Community-built MCP server for the <a href="https://peec.ai">Peec AI</a> API — AI Search Analytics for brand visibility, sentiment, and citations across ChatGPT, Perplexity, and other AI models.
  </p>
</p>

<p align="center">
  <a href="https://github.com/thein-art/mcp-server-peecai/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/thein-art/mcp-server-peecai/ci.yml?branch=main&style=flat-square&label=CI" alt="CI"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen?style=flat-square&logo=node.js&logoColor=white" alt="Node.js >= 22">
  <img src="https://img.shields.io/badge/MCP-compatible-0098FF?style=flat-square" alt="MCP compatible">
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/thein-art/mcp-server-peecai?style=flat-square" alt="License"></a>
  <a href="https://www.npmjs.com/package/mcp-server-peecai"><img src="https://img.shields.io/npm/v/mcp-server-peecai?style=flat-square" alt="npm"></a>
  <a href="https://www.npmjs.com/package/mcp-server-peecai"><img src="https://img.shields.io/npm/dm/mcp-server-peecai?style=flat-square" alt="Downloads"></a>
</p>

> **Note:** This is an unofficial community project, not affiliated with or endorsed by Peec AI. It requires a [Peec AI](https://peec.ai) account and API key.

> **API Beta:** The Peec AI API is currently in beta — endpoints, payloads, and responses may change. Access is limited to Enterprise customers.

---

## What it does

Peec AI tracks how brands appear in AI-generated answers. This MCP server gives any MCP-compatible client direct access to that data — 11 tools covering projects, brands, prompts, chats, and analytics reports.

**Key capabilities:**
- Query brand visibility, sentiment, and position across AI models
- Analyze which domains and URLs get cited in AI responses
- Inspect individual chat interactions with full source attribution
- Slice data by model, prompt, category tag, or topic

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

### Data Retrieval

**`list_projects`** — List all projects for the company.
- Returns: project IDs, names, statuses (`CUSTOMER` = active, `PITCH_ENDED` = completed)
- Parameters: `limit`, `offset`

**`list_brands`** — List tracked brands with their associated domains.
- Parameters: `project_id`, `limit`, `offset`

**`list_prompts`** — List monitored search prompts.
- Returns: prompt messages, tags, topics, user location, search volume
- Parameters: `project_id`, `limit`, `offset`

**`list_tags`** — List category tags for a project.
- Parameters: `project_id`, `limit`, `offset`

**`list_topics`** — List topic groupings for a project.
- Parameters: `project_id`, `limit`, `offset`

**`list_models`** — List tracked AI models (ChatGPT, Perplexity, etc.).
- Returns: model IDs and active status
- Parameters: `project_id`, `limit`, `offset`

**`list_chats`** — List AI chat interactions with optional date filtering.
- Returns: chat IDs, prompt/model refs, dates
- Parameters: `project_id`, `start_date`, `end_date`, `limit`, `offset`

**`get_chat_content`** — Get full content of a specific chat.
- Returns: sources (URLs, domains, citation counts), brands mentioned, messages, queries, products
- Parameters: `chat_id`, `project_id`

### Analytics Reports

All report tools support `dimensions` for multi-level breakdowns: `prompt_id`, `model_id`, `tag_id`, `topic_id`. Date filtering via `start_date` / `end_date` (YYYY-MM-DD). All report tools also accept a `filters` parameter for server-side filtering (`field`, `operator: "in" | "not_in"`, `values`). Convenience shortcuts `brand_id` / `classification` remain available.

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
| `usage_rate` | Share of chats citing this domain (0–1) |
| `citation_avg` | Average citations per chat |
| `classification` | `OWN`, `CORPORATE`, `COMPETITOR`, `EDITORIAL`, `REFERENCE`, `INSTITUTIONAL`, `UGC`, `OTHER` |

**`get_urls_report`** — URL-level analytics.

| Metric | Description |
|--------|-------------|
| `usage_count` | Number of chats citing this URL |
| `citation_count` | Total citations across all chats |
| `citation_avg` | Average citations per chat |
| `classification` | `HOMEPAGE`, `PRODUCT_PAGE`, `CATEGORY_PAGE`, `LISTICLE`, `COMPARISON`, `ARTICLE`, `HOW_TO_GUIDE`, `PROFILE`, `ALTERNATIVE`, `DISCUSSION`, `OTHER` |

### Tool Annotations

| Tool | Read-only | Idempotent | Destructive |
|------|:---------:|:----------:|:-----------:|
| All 11 tools | Yes | Yes | No |

All tools are read-only GET/POST queries against the Peec AI API. No data is modified.

## Example Prompts

```
"List my Peec AI projects"
"Show brand visibility for the last 30 days"
"Which domains get cited most in AI search results?"
"Compare brand sentiment across ChatGPT and Perplexity"
"Show me the full chat content for chat ID abc-123"
"Get URL report broken down by AI model"
```

## Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `PEECAI_API_KEY` | Yes | API key from [app.peec.ai](https://app.peec.ai/api-keys) |
| `PEECAI_PROJECT_ID` | No | Default project ID — saves repeating it in every tool call |

## API Drift Detection

The Peec AI API is in beta and may change. A drift detection script compares the live OpenAPI spec against a committed snapshot:

```bash
npm run check:api-drift
```

- **No drift**: exit code 0, snapshot is current
- **Drift detected**: exit code 1, shows a diff of changes

When drift is detected:
1. Review the diff to understand what changed
2. Update the snapshot: `curl -s https://api.peec.ai/customer/v1/openapi/json -o api-spec/openapi-snapshot.json`
3. Update `src/types.ts` and tools as needed
4. Run tests to verify

No API key is required — the OpenAPI spec is publicly accessible.

## Development

### Prerequisites

- Node.js >= 22
- npm

### Commands

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript to dist/
npm run dev          # Watch mode — recompile on changes
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run check:api-drift  # Check for API spec changes
```

### Project Structure

```
src/
├── index.ts          # Server entry point, tool registration
├── api-client.ts     # HTTP client for Peec AI Customer API
├── types.ts          # TypeScript interfaces for API responses
├── util.ts           # Shared validation, date handling, MCP response helpers
├── prompts.ts        # MCP prompt templates (guided workflows)
└── tools/            # One file per MCP tool
    ├── projects.ts
    ├── brands.ts
    ├── prompts.ts
    ├── tags.ts
    ├── topics.ts
    ├── models.ts
    ├── chats.ts
    ├── chat-content.ts
    ├── report-brands.ts
    ├── report-domains.ts
    └── report-urls.ts
scripts/              # Development and CI scripts
└── check-api-drift.sh
api-spec/             # API specification snapshots
└── openapi-snapshot.json
```

## License

[MIT](./LICENSE)

---

Built by [Tobias Hein](https://github.com/thein-art) at [artaxo](https://artaxo.com) — a digital marketing agency specializing in AI Search Optimization.
