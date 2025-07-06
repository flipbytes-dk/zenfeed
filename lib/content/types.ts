// Content aggregation types and interfaces

export interface ContentItem {
  id: string;
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  publishedAt: Date;
  author: {
    name: string;
    avatar?: string;
    url?: string;
  };
  platform: 'youtube' | 'instagram' | 'twitter' | 'rss' | 'newsletter';
  contentType: 'video' | 'image' | 'text' | 'article';
  duration?: number; // in seconds for videos
  tags?: string[];
  metrics?: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
  };
}

export interface ContentSource {
  id: string;
  type: 'youtube' | 'instagram' | 'twitter' | 'rss' | 'newsletter' | 'category';
  name: string;
  url?: string;
  username?: string;
  priority: 'high' | 'medium' | 'low';
  active: boolean;
  description?: string;
  lastFetched?: Date;
  itemCount?: number;
  errorCount?: number;
  lastError?: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  rateLimit?: {
    remaining: number;
    reset: Date;
  };
}

export interface FetchContentOptions {
  limit?: number;
  since?: Date;
  includeMetrics?: boolean;
}

export interface ContentAggregatorConfig {
  youtube?: {
    apiKey?: string;
    quotaLimit?: number;
  };
  twitter?: {
    bearerToken?: string;
    apiKey?: string;
    apiSecret?: string;
  };
  instagram?: {
    accessToken?: string;
    appId?: string;
  };
  rss?: {
    timeout?: number;
    maxItems?: number;
  };
}

export abstract class ContentAggregator {
  abstract platform: string;
  abstract fetchContent(source: ContentSource, options?: FetchContentOptions): Promise<APIResponse<ContentItem[]>>;
  abstract validateSource(source: ContentSource): Promise<APIResponse<boolean>>;
  abstract getSourceInfo(source: ContentSource): Promise<APIResponse<{ name: string; description?: string; followerCount?: number }>>;
}

export class ContentAggregationError extends Error {
  platform: string;
  sourceId: string;
  code: 'RATE_LIMIT' | 'INVALID_SOURCE' | 'API_ERROR' | 'NETWORK_ERROR' | 'PARSE_ERROR';
  retryAfter?: number;

  constructor(message: string, platform: string, sourceId: string, code: ContentAggregationError['code'], retryAfter?: number) {
    super(message);
    this.name = 'ContentAggregationError';
    this.platform = platform;
    this.sourceId = sourceId;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}
