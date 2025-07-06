import { ContentAggregator, ContentItem, ContentSource, APIResponse, FetchContentOptions, ContentAggregationError } from './types';
import { RSSAggregator } from './rss-aggregator';
import { YouTubeAggregator } from './youtube-aggregator';

interface AggregationResult {
  sourceId: string;
  success: boolean;
  items?: ContentItem[];
  error?: string;
  rateLimit?: {
    remaining: number;
    reset: Date;
  };
}

export class ContentAggregationService {
  private aggregators: Map<string, ContentAggregator> = new Map();
  private rateLimits: Map<string, { remaining: number; reset: Date }> = new Map();

  constructor() {
    this.initializeAggregators();
  }

  private initializeAggregators() {
    // Initialize RSS aggregator (always available)
    this.aggregators.set('rss', new RSSAggregator());
    this.aggregators.set('newsletter', new RSSAggregator()); // Newsletters use RSS-like feeds

    // Initialize YouTube aggregator if API key is available
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    if (youtubeApiKey) {
      this.aggregators.set('youtube', new YouTubeAggregator(youtubeApiKey));
    }

    // TODO: Initialize other aggregators when implemented
    // this.aggregators.set('instagram', new InstagramAggregator());
    // this.aggregators.set('twitter', new TwitterAggregator());
  }

  async fetchContentFromSource(source: ContentSource, options: FetchContentOptions = {}): Promise<AggregationResult> {
    const aggregator = this.aggregators.get(source.type);
    
    if (!aggregator) {
      return {
        sourceId: source.id,
        success: false,
        error: `No aggregator available for platform: ${source.type}`,
      };
    }

    // Check rate limits
    const rateLimitKey = `${source.type}`;
    const rateLimit = this.rateLimits.get(rateLimitKey);
    if (rateLimit && rateLimit.remaining <= 0 && new Date() < rateLimit.reset) {
      return {
        sourceId: source.id,
        success: false,
        error: `Rate limit exceeded for ${source.type}. Try again after ${rateLimit.reset.toISOString()}`,
        rateLimit,
      };
    }

    try {
      const result = await aggregator.fetchContent(source, options);
      
      // Update rate limit tracking if provided
      if (result.rateLimit) {
        this.rateLimits.set(rateLimitKey, result.rateLimit);
      }

      return {
        sourceId: source.id,
        success: result.success,
        items: result.data,
        error: result.error,
        rateLimit: result.rateLimit,
      };
    } catch (error) {
      console.error(`Error fetching content from ${source.type} source ${source.id}:`, error);
      
      return {
        sourceId: source.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async fetchContentFromMultipleSources(sources: ContentSource[], options: FetchContentOptions = {}): Promise<AggregationResult[]> {
    const results = await Promise.allSettled(
      sources.map(source => this.fetchContentFromSource(source, options))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          sourceId: sources[index].id,
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Promise rejected',
        };
      }
    });
  }

  async validateSource(source: ContentSource): Promise<APIResponse<boolean>> {
    const aggregator = this.aggregators.get(source.type);
    
    if (!aggregator) {
      return {
        success: false,
        error: `No aggregator available for platform: ${source.type}`,
      };
    }

    try {
      return await aggregator.validateSource(source);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  async getSourceInfo(source: ContentSource): Promise<APIResponse<{ name: string; description?: string; followerCount?: number }>> {
    const aggregator = this.aggregators.get(source.type);
    
    if (!aggregator) {
      return {
        success: false,
        error: `No aggregator available for platform: ${source.type}`,
      };
    }

    try {
      return await aggregator.getSourceInfo(source);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get source info',
      };
    }
  }

  getAvailablePlatforms(): string[] {
    return Array.from(this.aggregators.keys());
  }

  isPlatformSupported(platform: string): boolean {
    return this.aggregators.has(platform);
  }

  getRateLimitInfo(platform: string): { remaining: number; reset: Date } | null {
    return this.rateLimits.get(platform) || null;
  }

  // Utility method to aggregate content from all sources and merge by recency
  async aggregateAllContent(sources: ContentSource[], options: FetchContentOptions = {}): Promise<{
    items: ContentItem[];
    errors: Array<{ sourceId: string; error: string }>;
    totalSources: number;
    successfulSources: number;
  }> {
    const results = await this.fetchContentFromMultipleSources(sources, options);
    
    const allItems: ContentItem[] = [];
    const errors: Array<{ sourceId: string; error: string }> = [];
    
    let successfulSources = 0;

    for (const result of results) {
      if (result.success && result.items) {
        allItems.push(...result.items);
        successfulSources++;
      } else if (result.error) {
        errors.push({
          sourceId: result.sourceId,
          error: result.error,
        });
      }
    }

    // Sort all items by published date (newest first)
    allItems.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    // Apply global limit if specified
    const finalItems = options.limit ? allItems.slice(0, options.limit) : allItems;

    return {
      items: finalItems,
      errors,
      totalSources: sources.length,
      successfulSources,
    };
  }

  // Method to prioritize content based on source priority
  async aggregateContentWithPriority(sources: ContentSource[], options: FetchContentOptions = {}): Promise<{
    items: ContentItem[];
    errors: Array<{ sourceId: string; error: string }>;
  }> {
    // Group sources by priority
    const highPriority = sources.filter(s => s.priority === 'high');
    const mediumPriority = sources.filter(s => s.priority === 'medium');
    const lowPriority = sources.filter(s => s.priority === 'low');

    // Fetch from high priority sources first
    const highPriorityResults = await this.fetchContentFromMultipleSources(highPriority, {
      ...options,
      limit: Math.ceil((options.limit || 20) * 0.5), // 50% from high priority
    });

    const mediumPriorityResults = await this.fetchContentFromMultipleSources(mediumPriority, {
      ...options,
      limit: Math.ceil((options.limit || 20) * 0.3), // 30% from medium priority
    });

    const lowPriorityResults = await this.fetchContentFromMultipleSources(lowPriority, {
      ...options,
      limit: Math.ceil((options.limit || 20) * 0.2), // 20% from low priority
    });

    // Combine results
    const allResults = [...highPriorityResults, ...mediumPriorityResults, ...lowPriorityResults];
    
    const allItems: ContentItem[] = [];
    const errors: Array<{ sourceId: string; error: string }> = [];

    for (const result of allResults) {
      if (result.success && result.items) {
        allItems.push(...result.items);
      } else if (result.error) {
        errors.push({
          sourceId: result.sourceId,
          error: result.error,
        });
      }
    }

    // Sort by published date but maintain some priority weighting
    allItems.sort((a, b) => {
      const aSource = sources.find(s => s.id === a.id.split('-')[0]);
      const bSource = sources.find(s => s.id === b.id.split('-')[0]);
      
      // Priority weights
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const aWeight = priorityWeight[aSource?.priority || 'medium'];
      const bWeight = priorityWeight[bSource?.priority || 'medium'];
      
      // Combine recency and priority (newer content gets higher score)
      const aScore = a.publishedAt.getTime() + (aWeight * 86400000); // Add priority as bonus days
      const bScore = b.publishedAt.getTime() + (bWeight * 86400000);
      
      return bScore - aScore;
    });

    return {
      items: options.limit ? allItems.slice(0, options.limit) : allItems,
      errors,
    };
  }
}

// Export singleton instance
export const contentAggregationService = new ContentAggregationService();
