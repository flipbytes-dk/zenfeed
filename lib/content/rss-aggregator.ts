import { ContentAggregator, ContentItem, ContentSource, APIResponse, FetchContentOptions, ContentAggregationError } from './types';

export class RSSAggregator extends ContentAggregator {
  platform = 'rss';

  async fetchContent(source: ContentSource, options: FetchContentOptions = {}): Promise<APIResponse<ContentItem[]>> {
    try {
      if (!source.url) {
        throw this.createError('INVALID_SOURCE', 'RSS source requires a URL', source.id);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(source.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'ZenFeed/1.0 (Content Aggregator)',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw this.createError('API_ERROR', `HTTP ${response.status}: ${response.statusText}`, source.id);
      }

      const feedText = await response.text();
      const items = await this.parseFeed(feedText, source, options);

      return {
        success: true,
        data: items,
      };
    } catch (error) {
      if (error instanceof ContentAggregationError) {
        return { success: false, error: error.message };
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return { success: false, error: 'Request timeout - RSS feed took too long to respond' };
        }
        
        return { 
          success: false, 
          error: `Failed to fetch RSS feed: ${error.message}` 
        };
      }

      return { success: false, error: 'Unknown error occurred while fetching RSS feed' };
    }
  }

  async validateSource(source: ContentSource): Promise<APIResponse<boolean>> {
    try {
      if (!source.url) {
        return { success: false, error: 'RSS source requires a URL' };
      }

      // Basic URL validation
      try {
        new URL(source.url);
      } catch {
        return { success: false, error: 'Invalid URL format' };
      }

      // Try to fetch and parse the feed
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for validation

      const response = await fetch(source.url, {
        method: 'HEAD', // Just check if the resource exists
        signal: controller.signal,
        headers: {
          'User-Agent': 'ZenFeed/1.0 (Content Aggregator)',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { 
          success: false, 
          error: `RSS feed not accessible: HTTP ${response.status}` 
        };
      }

      return { success: true, data: true };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return { success: false, error: 'Validation timeout - RSS feed took too long to respond' };
        }
        return { success: false, error: `Validation failed: ${error.message}` };
      }
      return { success: false, error: 'Unknown validation error' };
    }
  }

  async getSourceInfo(source: ContentSource): Promise<APIResponse<{ name: string; description?: string; followerCount?: number }>> {
    try {
      if (!source.url) {
        throw this.createError('INVALID_SOURCE', 'RSS source requires a URL', source.id);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(source.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'ZenFeed/1.0 (Content Aggregator)',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw this.createError('API_ERROR', `HTTP ${response.status}: ${response.statusText}`, source.id);
      }

      const feedText = await response.text();
      const feedInfo = this.extractFeedInfo(feedText);

      return {
        success: true,
        data: feedInfo,
      };
    } catch (error) {
      if (error instanceof ContentAggregationError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to get RSS feed information' };
    }
  }

  private async parseFeed(feedText: string, source: ContentSource, options: FetchContentOptions): Promise<ContentItem[]> {
    // Simple RSS/Atom parser (in a real implementation, you'd use a proper XML parser)
    const items: ContentItem[] = [];
    
    try {
      // Check if it's RSS or Atom
      const isAtom = feedText.includes('<feed') && feedText.includes('xmlns="http://www.w3.org/2005/Atom"');
      
      if (isAtom) {
        return this.parseAtomFeed(feedText, source, options);
      } else {
        return this.parseRSSFeed(feedText, source, options);
      }
    } catch (error) {
      throw this.createError('PARSE_ERROR', `Failed to parse RSS feed: ${error instanceof Error ? error.message : 'Unknown error'}`, source.id);
    }
  }

  private parseRSSFeed(feedText: string, source: ContentSource, options: FetchContentOptions): ContentItem[] {
    const items: ContentItem[] = [];
    
    // Extract channel info
    const channelMatch = feedText.match(/<channel[^>]*>([\s\S]*?)<\/channel>/);
    if (!channelMatch) {
      throw new Error('Invalid RSS format - no channel found');
    }

    const channelContent = channelMatch[1];
    
    // Extract feed title and description
    const titleMatch = channelContent.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>|<title[^>]*>(.*?)<\/title>/);
    const descMatch = channelContent.match(/<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>|<description[^>]*>(.*?)<\/description>/);
    
    const feedTitle = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : source.name;
    const feedDescription = descMatch ? (descMatch[1] || descMatch[2] || '').trim() : undefined;

    // Extract items
    const itemMatches = channelContent.match(/<item[^>]*>([\s\S]*?)<\/item>/g);
    
    if (!itemMatches) {
      return items;
    }

    for (const itemMatch of itemMatches) {
      try {
        const item = this.parseRSSItem(itemMatch, source, feedTitle);
        if (item && (!options.since || item.publishedAt >= options.since)) {
          items.push(item);
        }
      } catch (error) {
        console.warn('Failed to parse RSS item:', error);
        // Continue with other items
      }
    }

    // Sort by published date (newest first) and apply limit
    items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    
    if (options.limit) {
      return items.slice(0, options.limit);
    }

    return items;
  }

  private parseAtomFeed(feedText: string, source: ContentSource, options: FetchContentOptions): ContentItem[] {
    const items: ContentItem[] = [];
    
    // Extract feed title
    const titleMatch = feedText.match(/<title[^>]*>(.*?)<\/title>/);
    const feedTitle = titleMatch ? titleMatch[1].trim() : source.name;

    // Extract entries
    const entryMatches = feedText.match(/<entry[^>]*>([\s\S]*?)<\/entry>/g);
    
    if (!entryMatches) {
      return items;
    }

    for (const entryMatch of entryMatches) {
      try {
        const item = this.parseAtomEntry(entryMatch, source, feedTitle);
        if (item && (!options.since || item.publishedAt >= options.since)) {
          items.push(item);
        }
      } catch (error) {
        console.warn('Failed to parse Atom entry:', error);
        // Continue with other entries
      }
    }

    // Sort by published date (newest first) and apply limit
    items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    
    if (options.limit) {
      return items.slice(0, options.limit);
    }

    return items;
  }

  private parseRSSItem(itemXML: string, source: ContentSource, feedTitle: string): ContentItem | null {
    const extractText = (tag: string): string => {
      const cdataMatch = itemXML.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[(.*?)\\]\\]></${tag}>`));
      if (cdataMatch) return cdataMatch[1].trim();
      
      const textMatch = itemXML.match(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`));
      return textMatch ? textMatch[1].replace(/<[^>]*>/g, '').trim() : '';
    };

    const title = extractText('title');
    const description = extractText('description') || extractText('content:encoded');
    const link = extractText('link');
    const pubDate = extractText('pubDate');
    const guid = extractText('guid') || link;

    if (!title || !link) {
      return null;
    }

    let publishedAt: Date;
    try {
      publishedAt = pubDate ? new Date(pubDate) : new Date();
    } catch {
      publishedAt = new Date();
    }

    return {
      id: guid || `${source.id}-${Date.now()}-${Math.random()}`,
      title: title,
      description: description || undefined,
      url: link,
      publishedAt,
      author: {
        name: feedTitle,
        url: source.url,
      },
      platform: 'rss',
      contentType: 'article',
    };
  }

  private parseAtomEntry(entryXML: string, source: ContentSource, feedTitle: string): ContentItem | null {
    const extractText = (tag: string): string => {
      const match = entryXML.match(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`));
      return match ? match[1].replace(/<[^>]*>/g, '').trim() : '';
    };

    const extractAttribute = (tag: string, attr: string): string => {
      const match = entryXML.match(new RegExp(`<${tag}[^>]*${attr}=["'](.*?)["'][^>]*>`));
      return match ? match[1] : '';
    };

    const title = extractText('title');
    const summary = extractText('summary') || extractText('content');
    const link = extractAttribute('link', 'href');
    const updated = extractText('updated') || extractText('published');
    const id = extractText('id');

    if (!title || !link) {
      return null;
    }

    let publishedAt: Date;
    try {
      publishedAt = updated ? new Date(updated) : new Date();
    } catch {
      publishedAt = new Date();
    }

    return {
      id: id || `${source.id}-${Date.now()}-${Math.random()}`,
      title: title,
      description: summary || undefined,
      url: link,
      publishedAt,
      author: {
        name: feedTitle,
        url: source.url,
      },
      platform: 'rss',
      contentType: 'article',
    };
  }

  private extractFeedInfo(feedText: string): { name: string; description?: string } {
    // Extract title
    const titleMatch = feedText.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>|<title[^>]*>(.*?)<\/title>/);
    const title = titleMatch ? (titleMatch[1] || titleMatch[2] || '').replace(/<[^>]*>/g, '').trim() : 'RSS Feed';

    // Extract description
    const descMatch = feedText.match(/<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>|<description[^>]*>(.*?)<\/description>/);
    const description = descMatch ? (descMatch[1] || descMatch[2] || '').replace(/<[^>]*>/g, '').trim() : undefined;

    return {
      name: title,
      description: description || undefined,
    };
  }

  private createError(code: ContentAggregationError['code'], message: string, sourceId: string): ContentAggregationError {
    return new ContentAggregationError(message, this.platform, sourceId, code);
  }
}
