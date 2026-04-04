/**
 * CRUD integration test — exercises every write operation against the live API.
 *
 * Requires:
 *   PEECAI_API_KEY          — API key (from zshrc)
 *   PEECAI_TEST_PROJECT_ID  — a PITCH project for testing (e.g. seo-trainee.de)
 *   PEECAI_ALLOW_WRITES     — must be "true"
 *
 * Run:
 *   PEECAI_ALLOW_WRITES=true PEECAI_TEST_PROJECT_ID=or_xxx npm run test:integration
 *
 * Skipped entirely when PEECAI_TEST_PROJECT_ID is not set.
 */
import { describe, it, expect, afterAll } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PeecApiClient } from "../../src/api-client.js";

// Read-only tools
import { registerBrandsTool } from "../../src/tools/brands.js";
import { registerPromptsTool } from "../../src/tools/prompts.js";
import { registerTagsTool } from "../../src/tools/tags.js";
import { registerTopicsTool } from "../../src/tools/topics.js";
import { registerPromptSuggestionsTool } from "../../src/tools/prompt-suggestions.js";
import { registerTopicSuggestionsTool } from "../../src/tools/topic-suggestions.js";

// Write tools
import { registerWriteBrandsTools } from "../../src/tools/write-brands.js";
import { registerWritePromptsTools } from "../../src/tools/write-prompts.js";
import { registerWriteTagsTools } from "../../src/tools/write-tags.js";
import { registerWriteTopicsTools } from "../../src/tools/write-topics.js";
import { registerSuggestionActionTools } from "../../src/tools/suggestion-actions.js";

const API_KEY = process.env.PEECAI_API_KEY;
const PROJECT_ID = process.env.PEECAI_TEST_PROJECT_ID;
const SKIP = !API_KEY || !PROJECT_ID;

const extra = { signal: new AbortController().signal, _meta: {}, sendNotification: async () => {} };

// ── Helpers ──

function h(server: McpServer, name: string) {
  return (server as any)._registeredTools[name].handler;
}

function parse(result: any) {
  return JSON.parse(result.content[0].text);
}

function assertSuccess(result: any) {
  if (result.isError) {
    throw new Error(`Tool returned error: ${result.content[0].text}`);
  }
  return parse(result);
}

// ── Cleanup tracker ──

const cleanup: Array<{ tool: string; params: Record<string, any> }> = [];

describe.skipIf(SKIP)("CRUD integration test", () => {
  let server: McpServer;

  // Captured IDs across tests
  let tagId: string;
  let topicId: string;
  let brandId: string;
  let tagId2: string;
  let topicId2: string;
  let promptId: string;

  // Setup once
  const client = new PeecApiClient(API_KEY!);
  server = new McpServer({ name: "crud-test", version: "0.0.1" });

  // Register all tools
  registerBrandsTool(server, client);
  registerPromptsTool(server, client);
  registerTagsTool(server, client);
  registerTopicsTool(server, client);
  registerPromptSuggestionsTool(server, client);
  registerTopicSuggestionsTool(server, client);
  registerWriteBrandsTools(server, client);
  registerWritePromptsTools(server, client);
  registerWriteTagsTools(server, client);
  registerWriteTopicsTools(server, client);
  registerSuggestionActionTools(server, client);

  // Safety net — clean up any entities that tests didn't delete
  afterAll(async () => {
    for (const { tool, params } of cleanup) {
      try {
        await h(server, tool)({ ...params, project_id: PROJECT_ID }, extra);
      } catch { /* best effort */ }
    }
  }, 30_000);

  // ────────────────────────────────────────────
  // 1. TAGS CRUD
  // ────────────────────────────────────────────

  describe("Tags CRUD", () => {
    it("create_tag", async () => {
      const result = await h(server, "create_tag")({
        project_id: PROJECT_ID, name: "SEO Basics", color: "blue",
      }, extra);
      const parsed = assertSuccess(result);
      console.error(`  Created tag: ${parsed.tag_id}`);
      expect(parsed._summary).toBe("Tag created");
      expect(parsed.tag_id).toBeDefined();
      tagId = parsed.tag_id;
      cleanup.push({ tool: "delete_tag", params: { tag_id: tagId } });
    });

    it("list_tags → new tag appears", async () => {
      const result = await h(server, "list_tags")({ project_id: PROJECT_ID, limit: 1000, offset: 0 }, extra);
      const parsed = assertSuccess(result);
      const found = parsed.tags.find((t: any) => t.id === tagId);
      expect(found).toBeDefined();
      expect(found.name).toBe("SEO Basics");
      console.error(`  Found tag "${found.name}" in list (${parsed.tags.length} total)`);
    });

    it("update_tag", async () => {
      const result = await h(server, "update_tag")({
        project_id: PROJECT_ID, tag_id: tagId, name: "SEO Fundamentals", color: "green",
      }, extra);
      const parsed = assertSuccess(result);
      expect(parsed._summary).toBe("Tag updated");
      console.error(`  Updated tag ${tagId} → "SEO Fundamentals" (green)`);
    });

    it("list_tags → updated name/color", async () => {
      const result = await h(server, "list_tags")({ project_id: PROJECT_ID, limit: 1000, offset: 0 }, extra);
      const found = assertSuccess(result).tags.find((t: any) => t.id === tagId);
      expect(found.name).toBe("SEO Fundamentals");
      console.error(`  Verified update: "${found.name}"`);
    });

    it("delete_tag", async () => {
      const result = await h(server, "delete_tag")({
        project_id: PROJECT_ID, tag_id: tagId,
      }, extra);
      assertSuccess(result);
      cleanup.splice(cleanup.findIndex(c => c.params.tag_id === tagId), 1);
      console.error(`  Deleted tag ${tagId}`);
    });

    it("list_tags → tag gone", async () => {
      const result = await h(server, "list_tags")({ project_id: PROJECT_ID, limit: 1000, offset: 0 }, extra);
      const found = assertSuccess(result).tags.find((t: any) => t.id === tagId);
      expect(found).toBeUndefined();
      console.error(`  Confirmed tag ${tagId} is gone`);
    });
  });

  // ────────────────────────────────────────────
  // 2. TOPICS CRUD
  // ────────────────────────────────────────────

  describe("Topics CRUD", () => {
    it("create_topic", async () => {
      const result = await h(server, "create_topic")({
        project_id: PROJECT_ID, name: "On-Page SEO",
      }, extra);
      const parsed = assertSuccess(result);
      expect(parsed.topic_id).toBeDefined();
      topicId = parsed.topic_id;
      cleanup.push({ tool: "delete_topic", params: { topic_id: topicId } });
      console.error(`  Created topic: ${topicId}`);
    });

    it("list_topics → new topic appears", async () => {
      const result = await h(server, "list_topics")({ project_id: PROJECT_ID, limit: 1000, offset: 0 }, extra);
      const found = assertSuccess(result).topics.find((t: any) => t.id === topicId);
      expect(found).toBeDefined();
      expect(found.name).toBe("On-Page SEO");
      console.error(`  Found topic "${found.name}"`);
    });

    it("update_topic", async () => {
      const result = await h(server, "update_topic")({
        project_id: PROJECT_ID, topic_id: topicId, name: "On-Page Optimization",
      }, extra);
      assertSuccess(result);
      console.error(`  Updated topic → "On-Page Optimization"`);
    });

    it("list_topics → updated name", async () => {
      const result = await h(server, "list_topics")({ project_id: PROJECT_ID, limit: 1000, offset: 0 }, extra);
      const found = assertSuccess(result).topics.find((t: any) => t.id === topicId);
      expect(found.name).toBe("On-Page Optimization");
      console.error(`  Verified update: "${found.name}"`);
    });

    it("delete_topic", async () => {
      await h(server, "delete_topic")({ project_id: PROJECT_ID, topic_id: topicId }, extra);
      cleanup.splice(cleanup.findIndex(c => c.params.topic_id === topicId), 1);
      console.error(`  Deleted topic ${topicId}`);
    });

    it("list_topics → topic gone", async () => {
      const result = await h(server, "list_topics")({ project_id: PROJECT_ID, limit: 1000, offset: 0 }, extra);
      const found = assertSuccess(result).topics.find((t: any) => t.id === topicId);
      expect(found).toBeUndefined();
      console.error(`  Confirmed topic gone`);
    });
  });

  // ────────────────────────────────────────────
  // 3. BRANDS CRUD
  // ────────────────────────────────────────────

  describe("Brands CRUD", () => {
    it("create_brand", async () => {
      const result = await h(server, "create_brand")({
        project_id: PROJECT_ID, name: "SEO-Trainee", domains: ["seo-trainee.de"],
      }, extra);
      const parsed = assertSuccess(result);
      expect(parsed.brand_id).toBeDefined();
      brandId = parsed.brand_id;
      cleanup.push({ tool: "delete_brand", params: { brand_id: brandId } });
      console.error(`  Created brand: ${brandId}`);
    });

    it("list_brands → new brand appears with domain", async () => {
      const result = await h(server, "list_brands")({ project_id: PROJECT_ID, limit: 1000, offset: 0 }, extra);
      const found = assertSuccess(result).brands.find((b: any) => b.id === brandId);
      expect(found).toBeDefined();
      expect(found.name).toBe("SEO-Trainee");
      expect(found.domains).toContain("seo-trainee.de");
      console.error(`  Found brand "${found.name}" with domains: ${found.domains.join(", ")}`);
    });

    it("update_brand — add alias and domain", async () => {
      const result = await h(server, "update_brand")({
        project_id: PROJECT_ID,
        brand_id: brandId,
        aliases: ["SEO Trainee Blog"],
        domains: ["seo-trainee.de", "www.seo-trainee.de"],
      }, extra);
      assertSuccess(result);
      console.error(`  Updated brand — added alias + domain`);
    });

    it("list_brands → updated fields", async () => {
      const result = await h(server, "list_brands")({ project_id: PROJECT_ID, limit: 1000, offset: 0 }, extra);
      const found = assertSuccess(result).brands.find((b: any) => b.id === brandId);
      expect(found.domains).toContain("www.seo-trainee.de");
      console.error(`  Verified update: domains=${found.domains.join(", ")}`);
    });

    it("delete_brand", async () => {
      await h(server, "delete_brand")({ project_id: PROJECT_ID, brand_id: brandId }, extra);
      cleanup.splice(cleanup.findIndex(c => c.params.brand_id === brandId), 1);
      console.error(`  Deleted brand ${brandId}`);
    });

    it("list_brands → brand gone", async () => {
      const result = await h(server, "list_brands")({ project_id: PROJECT_ID, limit: 1000, offset: 0 }, extra);
      const found = assertSuccess(result).brands.find((b: any) => b.id === brandId);
      expect(found).toBeUndefined();
      console.error(`  Confirmed brand gone`);
    });
  });

  // ────────────────────────────────────────────
  // 4. PROMPTS CRUD (with topic + tag dependencies)
  // ────────────────────────────────────────────

  describe("Prompts CRUD", () => {
    it("setup: create topic + tag for prompt", async () => {
      const topicResult = await h(server, "create_topic")({
        project_id: PROJECT_ID, name: "Link Building",
      }, extra);
      topicId2 = assertSuccess(topicResult).topic_id;
      cleanup.push({ tool: "delete_topic", params: { topic_id: topicId2 } });

      const tagResult = await h(server, "create_tag")({
        project_id: PROJECT_ID, name: "Advanced", color: "purple",
      }, extra);
      tagId2 = assertSuccess(tagResult).tag_id;
      cleanup.push({ tool: "delete_tag", params: { tag_id: tagId2 } });

      console.error(`  Created topic ${topicId2} + tag ${tagId2}`);
    });

    it("create_prompt", async () => {
      const result = await h(server, "create_prompt")({
        project_id: PROJECT_ID,
        text: "Was sind die besten Link-Building-Strategien?",
        country_code: "DE",
        topic_id: topicId2,
        tag_ids: [tagId2],
      }, extra);
      const parsed = assertSuccess(result);
      expect(parsed.prompt_id).toBeDefined();
      promptId = parsed.prompt_id;
      cleanup.push({ tool: "delete_prompt", params: { prompt_id: promptId } });
      console.error(`  Created prompt: ${promptId}`);
    });

    it("list_prompts → prompt appears with topic/tag/location", async () => {
      const result = await h(server, "list_prompts")({ project_id: PROJECT_ID, limit: 1000, offset: 0 }, extra);
      const found = assertSuccess(result).prompts.find((p: any) => p.id === promptId);
      expect(found).toBeDefined();
      expect(found.messages[0].content).toContain("Link-Building");
      expect(found.topic?.id).toBe(topicId2);
      expect(found.tags.some((t: any) => t.id === tagId2)).toBe(true);
      expect(found.user_location?.country).toBe("DE");
      console.error(`  Found prompt: "${found.messages[0].content.slice(0, 50)}..." topic=${found.topic?.id} tags=${found.tags.length} country=${found.user_location?.country}`);
    });

    it("update_prompt — detach topic", async () => {
      const result = await h(server, "update_prompt")({
        project_id: PROJECT_ID, prompt_id: promptId, topic_id: null,
      }, extra);
      assertSuccess(result);
      console.error(`  Updated prompt — detached topic`);
    });

    it("list_prompts → topic is null", async () => {
      const result = await h(server, "list_prompts")({ project_id: PROJECT_ID, limit: 1000, offset: 0 }, extra);
      const found = assertSuccess(result).prompts.find((p: any) => p.id === promptId);
      expect(found.topic).toBeNull();
      console.error(`  Verified: topic is null`);
    });

    it("delete_prompt", async () => {
      await h(server, "delete_prompt")({ project_id: PROJECT_ID, prompt_id: promptId }, extra);
      cleanup.splice(cleanup.findIndex(c => c.params.prompt_id === promptId), 1);
      console.error(`  Deleted prompt ${promptId}`);
    });

    it("list_prompts → prompt gone", async () => {
      const result = await h(server, "list_prompts")({ project_id: PROJECT_ID, limit: 1000, offset: 0 }, extra);
      const found = assertSuccess(result).prompts.find((p: any) => p.id === promptId);
      expect(found).toBeUndefined();
      console.error(`  Confirmed prompt gone`);
    });

    it("cleanup: delete topic + tag", async () => {
      await h(server, "delete_tag")({ project_id: PROJECT_ID, tag_id: tagId2 }, extra);
      cleanup.splice(cleanup.findIndex(c => c.params.tag_id === tagId2), 1);
      await h(server, "delete_topic")({ project_id: PROJECT_ID, topic_id: topicId2 }, extra);
      cleanup.splice(cleanup.findIndex(c => c.params.topic_id === topicId2), 1);
      console.error(`  Cleaned up topic + tag`);
    });
  });

  // ────────────────────────────────────────────
  // 5. SUGGESTIONS (if available)
  // ────────────────────────────────────────────

  describe("Suggestions", () => {
    it("prompt suggestions — reject if available", async () => {
      const result = await h(server, "list_prompt_suggestions")({
        project_id: PROJECT_ID, limit: 5, offset: 0,
      }, extra);
      const parsed = assertSuccess(result);
      console.error(`  ${parsed.prompt_suggestions.length} prompt suggestions found`);

      if (parsed.prompt_suggestions.length > 0) {
        const id = parsed.prompt_suggestions[0].id;
        const rejectResult = await h(server, "reject_prompt_suggestion")({
          project_id: PROJECT_ID, prompt_suggestion_id: id,
        }, extra);
        assertSuccess(rejectResult);
        console.error(`  Rejected prompt suggestion ${id}`);
      } else {
        console.error(`  No prompt suggestions to test — skipping reject`);
      }
    });

    it("topic suggestions — reject if available", async () => {
      const result = await h(server, "list_topic_suggestions")({
        project_id: PROJECT_ID, limit: 5, offset: 0,
      }, extra);
      const parsed = assertSuccess(result);
      console.error(`  ${parsed.topic_suggestions.length} topic suggestions found`);

      if (parsed.topic_suggestions.length > 0) {
        const id = parsed.topic_suggestions[0].id;
        const rejectResult = await h(server, "reject_topic_suggestion")({
          project_id: PROJECT_ID, topic_suggestion_id: id,
        }, extra);
        assertSuccess(rejectResult);
        console.error(`  Rejected topic suggestion ${id}`);
      } else {
        console.error(`  No topic suggestions to test — skipping reject`);
      }
    });
  });

  // ────────────────────────────────────────────
  // 6. FINAL VERIFICATION
  // ────────────────────────────────────────────

  describe("Final cleanup verification", () => {
    it("no leftover test entities", async () => {
      const brands = assertSuccess(await h(server, "list_brands")({ project_id: PROJECT_ID, limit: 1000, offset: 0 }, extra));
      const tags = assertSuccess(await h(server, "list_tags")({ project_id: PROJECT_ID, limit: 1000, offset: 0 }, extra));
      const topics = assertSuccess(await h(server, "list_topics")({ project_id: PROJECT_ID, limit: 1000, offset: 0 }, extra));
      const prompts = assertSuccess(await h(server, "list_prompts")({ project_id: PROJECT_ID, limit: 1000, offset: 0 }, extra));

      console.error(`  Final state: ${brands.brands.length} brands, ${tags.tags.length} tags, ${topics.topics.length} topics, ${prompts.prompts.length} prompts`);

      // Verify our test entities are gone
      expect(brands.brands.find((b: any) => b.name === "SEO-Trainee")).toBeUndefined();
      expect(tags.tags.find((t: any) => t.name === "SEO Fundamentals" || t.name === "SEO Basics" || t.name === "Advanced")).toBeUndefined();
      expect(topics.topics.find((t: any) => t.name === "On-Page SEO" || t.name === "On-Page Optimization" || t.name === "Link Building")).toBeUndefined();
    });
  });
});
