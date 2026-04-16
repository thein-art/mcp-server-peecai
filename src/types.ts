/** Standard Peec AI API envelope — most list/report endpoints wrap results in `{ data: T }`. */
export interface ApiResponse<T> {
  data: T;
}

/** A Peec AI project representing a tracked brand or campaign. */
export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
}

export type ProjectStatus =
  | "CUSTOMER"
  | "CUSTOMER_ENDED"
  | "PITCH"
  | "PITCH_ENDED"
  | "TRIAL"
  | "TRIAL_ENDED"
  | "ONBOARDING"
  | "DELETED"
  | "API_PARTNER"
  | "PAUSED";

/** A brand being tracked within a project, with its associated domains. */
export interface Brand {
  id: string;
  name: string;
  domains?: string[];
  is_own: boolean;
}

export interface PromptMessage {
  content: string;
}

/** A search prompt that Peec AI monitors across AI models. */
export interface Prompt {
  id: string;
  messages: PromptMessage[];
  tags: DimensionRef[];
  topic: DimensionRef | null;
  user_location: { country: string };
  /** Estimated monthly search volume. */
  volume?: number;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Topic {
  id: string;
  name: string;
}

/** A suggested prompt that can be accepted or rejected. */
export interface PromptSuggestion {
  id: string;
  messages: PromptMessage[];
  tags: DimensionRef[];
  topic: DimensionRef | null;
  user_location: { country: string };
  volume?: number;
}

/** A suggested topic that can be accepted or rejected. */
export interface TopicSuggestion {
  id: string;
  name: string;
}

/** An AI model tracked by Peec AI (e.g. ChatGPT, Perplexity). */
export interface Model {
  id: string;
  is_active: boolean;
}

/** A model channel groups one or more underlying models under a stable identifier (e.g. openai-0, perplexity-0). */
export interface ModelChannel {
  id: string;
  description: string;
  current_model: DimensionRef;
  is_active: boolean;
}

/** Summary of a single AI chat interaction. */
export interface Chat {
  id: string;
  prompt: DimensionRef;
  model: DimensionRef;
  model_channel?: DimensionRef;
  date: string;
}

/** A source URL cited in an AI chat response. */
export interface ChatSource {
  url: string;
  /** Normalized URL for deduplication; null if normalization was not possible. */
  urlNormalized: string | null;
  domain: string;
  citationCount: number;
  /** Position of this citation in the response (1-based). */
  citationPosition: number;
}

export interface ChatBrandMentioned {
  id: string;
  name: string;
  /** Position of this brand mention in the response (1-based). */
  position: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatProduct {
  name: string;
  queries: string[];
}

/** Full content of an AI chat including sources, brands, messages, and extracted products. */
export interface ChatContent {
  id: string;
  prompt: DimensionRef;
  model: DimensionRef;
  sources: ChatSource[];
  brands_mentioned: ChatBrandMentioned[];
  messages: ChatMessage[];
  queries: string[];
  products: ChatProduct[];
}

/** Lightweight reference to a dimension entity (prompt, model, tag, or topic) by ID. */
export interface DimensionRef {
  id: string;
}

/** Brand analytics row from the /reports/brands endpoint. */
export interface BrandReportRow {
  brand: { id: string; name: string };
  prompt?: DimensionRef;
  model?: DimensionRef;
  model_channel?: DimensionRef;
  tag?: DimensionRef;
  topic?: DimensionRef;
  /** Ratio 0–1: visibility_count / visibility_total. */
  visibility: number;
  visibility_count: number;
  visibility_total: number;
  /** Share of voice 0–1: proportion of total brand mentions. */
  share_of_voice?: number;
  /** Number of times this brand was mentioned. */
  mention_count: number;
  /** Sentiment score 0–100 (50 = neutral). Absent when no sentiment data. */
  sentiment?: number;
  sentiment_sum?: number;
  sentiment_count?: number;
  /** Average position when mentioned (lower = better). Absent when no position data. */
  position?: number;
  position_sum?: number;
  position_count?: number;
  /** ISO 3166-1 alpha-2 country code. Present when `country_code` dimension is used. */
  country_code?: string;
  /** Date string. Present when `date` dimension is used. */
  date?: string;
}

export type DomainClassification =
  | "UGC"
  | "CORPORATE"
  | "EDITORIAL"
  | "INSTITUTIONAL"
  | "OTHER"
  | "REFERENCE"
  | "COMPETITOR"
  | "OWN";

export type UrlClassification =
  | "HOMEPAGE"
  | "CATEGORY_PAGE"
  | "PRODUCT_PAGE"
  | "LISTICLE"
  | "COMPARISON"
  | "PROFILE"
  | "ALTERNATIVE"
  | "DISCUSSION"
  | "HOW_TO_GUIDE"
  | "ARTICLE"
  | "OTHER";

/** Domain analytics row from the /reports/domains endpoint. */
export interface DomainReportRow {
  domain: string;
  classification: DomainClassification | null;
  prompt?: DimensionRef;
  model?: DimensionRef;
  model_channel?: DimensionRef;
  tag?: DimensionRef;
  topic?: DimensionRef;
  /** Share of chats that retrieved this domain (0–1). */
  retrieved_percentage: number;
  /** Retrieval rate for this domain. */
  retrieval_rate: number;
  /** Citation rate for this domain. */
  citation_rate: number;
  /** @deprecated Use `retrieval_rate` instead. */
  usage_rate?: number;
  /** @deprecated Use `citation_rate` instead. */
  citation_avg?: number;
  /** ISO 3166-1 alpha-2 country code. Present when `country_code` dimension is used. */
  country_code?: string;
  /** Date string. Present when `date` dimension is used. */
  date?: string;
}

/** URL analytics row from the /reports/urls endpoint. */
export interface UrlReportRow {
  url: string;
  classification: UrlClassification | null;
  title: string | null;
  prompt?: DimensionRef;
  model?: DimensionRef;
  model_channel?: DimensionRef;
  tag?: DimensionRef;
  topic?: DimensionRef;
  /** Total citation count across all chats. */
  citation_count: number;
  /** Number of times this URL was retrieved. */
  retrievals: number;
  /** Citation rate for this URL. */
  citation_rate: number;
  /** @deprecated Use `retrievals` instead. */
  usage_count?: number;
  /** @deprecated Use `citation_rate` instead. */
  citation_avg?: number;
  /** ISO 3166-1 alpha-2 country code. Present when `country_code` dimension is used. */
  country_code?: string;
  /** Date string. Present when `date` dimension is used. */
  date?: string;
}

/** Scraped markdown content of a source URL returned by /sources/urls/content. */
export interface UrlContent {
  url: string;
  title: string | null;
  domain: string;
  channel_title: string | null;
  classification: DomainClassification | null;
  url_classification: UrlClassification | null;
  /** Markdown content of the page. Null if the URL is tracked but scraping hasn't completed yet. */
  content: string | null;
  /** Original character length of the stored content before truncation. 0 when content is null. */
  content_length: number;
  /** True if content was truncated to max_length. Re-request with a larger max_length to get more. */
  truncated: boolean;
  /** ISO timestamp of when the content was last scraped. */
  content_updated_at: string | null;
}

/** A search query generated by an AI model when answering a prompt. */
export interface SearchQueryRow {
  prompt: DimensionRef;
  chat: DimensionRef;
  model: DimensionRef | null;
  date: string;
  query: { index: number; text: string };
}

/** A shopping/product query generated by an AI model when answering a prompt. */
export interface ShoppingQueryRow {
  prompt: DimensionRef;
  chat: DimensionRef;
  model: DimensionRef | null;
  date: string;
  query: { text: string; products: string[] };
}
