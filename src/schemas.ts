/**
 * Zod output schemas for MCP tool responses.
 * Used as `outputSchema` in tool registration to enable structured content validation.
 */
import { z } from "zod";

// ── Entity schemas ──

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
});

export const brandSchema = z.object({
  id: z.string(),
  name: z.string(),
  domains: z.array(z.string()).optional(),
  is_own: z.boolean(),
});

const dimensionRefSchema = z.object({ id: z.string() });

const promptMessageSchema = z.object({ content: z.string() });

export const promptSchema = z.object({
  id: z.string(),
  messages: z.array(promptMessageSchema),
  tags: z.array(dimensionRefSchema),
  topic: dimensionRefSchema.nullable(),
  user_location: z.object({ country: z.string() }),
  volume: z.number().optional(),
});

export const tagSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const topicSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const modelSchema = z.object({
  id: z.string(),
  is_active: z.boolean(),
});

export const chatSchema = z.object({
  id: z.string(),
  prompt: dimensionRefSchema,
  model: dimensionRefSchema,
  date: z.string(),
});

export const promptSuggestionSchema = z.object({
  id: z.string(),
  messages: z.array(promptMessageSchema),
  tags: z.array(dimensionRefSchema),
  topic: dimensionRefSchema.nullable(),
  user_location: z.object({ country: z.string() }),
  volume: z.number().optional(),
});

export const topicSuggestionSchema = z.object({
  id: z.string(),
  name: z.string(),
});

// ── Chat content schemas ──

export const chatContentSchema = z.object({
  id: z.string(),
  prompt: dimensionRefSchema,
  model: dimensionRefSchema,
  sources: z.array(z.object({
    url: z.string(),
    urlNormalized: z.string().nullable(),
    domain: z.string(),
    citationCount: z.number(),
    citationPosition: z.number(),
  })),
  brands_mentioned: z.array(z.object({
    id: z.string(),
    name: z.string(),
    position: z.number(),
  })),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })),
  queries: z.array(z.string()),
  products: z.array(z.object({
    name: z.string(),
    queries: z.array(z.string()),
  })),
});

// ── Output wrapper schemas (for tool outputSchema) ──

const summaryField = z.string().describe("Human-readable summary of the result");

export const projectsOutput = { _summary: summaryField, projects: z.array(projectSchema) };
export const brandsOutput = { _summary: summaryField, brands: z.array(brandSchema) };
export const promptsOutput = { _summary: summaryField, prompts: z.array(promptSchema) };
export const tagsOutput = { _summary: summaryField, tags: z.array(tagSchema) };
export const topicsOutput = { _summary: summaryField, topics: z.array(topicSchema) };
export const modelsOutput = { _summary: summaryField, models: z.array(modelSchema) };
export const chatsOutput = { _summary: summaryField, chats: z.array(chatSchema) };
export const promptSuggestionsOutput = { _summary: summaryField, prompt_suggestions: z.array(promptSuggestionSchema) };
export const topicSuggestionsOutput = { _summary: summaryField, topic_suggestions: z.array(topicSuggestionSchema) };
export const chatContentOutput = { _summary: summaryField, chat: chatContentSchema };
