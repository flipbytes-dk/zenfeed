import { ContentAggregator, ContentItem, ContentSource, APIResponse, FetchContentOptions, ContentAggregationError } from './types';
import { XMLParser } from 'fast-xml-parser';

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
    const parser = new XMLParser({
      ignoreAttributes: false,
      allowBooleanAttributes: true,
      parseTagValue: true,
      parseAttributeValue: true,
      trimValues: true,
      textNodeName: "_text",
      ignoreDeclaration: true,
      ignorePiTags: true,
    });

    try {
      const json = parser.parse(feedText);
      
      // Check if it's RSS or Atom
      if (json.rss && json.rss.channel) {
        return this.parseRSSItems(json.rss.channel, source, options);
      } else if (json.feed) {
        return this.parseAtomItems(json.feed, source, options);
      } else {
        throw new Error('Unknown feed format - not RSS or Atom');
      }
    } catch (error) {
      throw this.createError('PARSE_ERROR', `Failed to parse RSS feed: ${error instanceof Error ? error.message : 'Unknown error'}`, source.id);
    }
  }

  private filterAndSortItems(items: ContentItem[], options: FetchContentOptions): ContentItem[] {
    // Filter by date if needed
    let filtered = items;
    if (options.since) {
      filtered = items.filter(item => item.publishedAt >= options.since!);
    }
    
    // Sort by published date (newest first)
    filtered.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    
    // Apply limit
    if (options.limit) {
      return filtered.slice(0, options.limit);
    }
    
    return filtered;
  }

  private decodeXMLEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
      .replace(/&#x([a-fA-F0-9]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  private sanitizeHTML(html: string): string {
    // Basic HTML sanitization
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  }

  private parseRSSItems(channel: any, source: ContentSource, options: FetchContentOptions): ContentItem[] {
  const items: ContentItem[] = [];
  
  const feedTitle = this.decodeXMLEntities(channel.title?._text || channel.title || source.name);
  const rssItems = Array.isArray(channel.item) ? channel.item : [channel.item].filter(Boolean);

  for (const rssItem of rssItems) {
    try {
        const item = this.convertRSSItemToContentItem(rssItem, source, feedTitle);
      if (item) {
        items.push(item);
      }
    } catch (error) {
      console.warn('Failed to parse RSS item:', error);
      // Continue with other items
    }
  }

  return this.filterAndSortItems(items, options);
  }

  private parseAtomItems(feed: any, source: ContentSource, options: FetchContentOptions): ContentItem[] {
    const items: ContentItem[] = [];
    
    const feedTitle = this.decodeXMLEntities(feed.title?._text || feed.title || source.name);
    const atomEntries = Array.isArray(feed.entry) ? feed.entry : [feed.entry].filter(Boolean);

    for (const atomEntry of atomEntries) {
      try {
        const item = this.convertAtomEntryToContentItem(atomEntry, source, feedTitle);
        if (item) {
          items.push(item);
        }
      } catch (error) {
        console.warn('Failed to parse Atom entry:', error);
        // Continue with other entries
      }
    }

    return this.filterAndSortItems(items, options);
  }

  private convertRSSItemToContentItem(rssItem: any, source: ContentSource, feedTitle: string): ContentItem | null {
    const title = this.decodeXMLEntities(rssItem.title?._text || rssItem.title || '');
    const description = this.decodeXMLEntities(
      rssItem.description?._text || 
      rssItem.description || 
      rssItem['content:encoded']?._text || 
      rssItem['content:encoded'] || 
      ''
    );
    const link = rssItem.link?._text || rssItem.link || '';
    const pubDate = rssItem.pubDate?._text || rssItem.pubDate || '';
    const guid = rssItem.guid?._text || rssItem.guid || link;

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
      sourceId: source.id,
      title: this.sanitizeHTML(title),
      description: this.sanitizeHTML(description) || undefined,
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

  private convertAtomEntryToContentItem(atomEntry: any, source: ContentSource, feedTitle: string): ContentItem | null {
    const title = this.decodeXMLEntities(atomEntry.title?._text || atomEntry.title || '');
    const summary = this.decodeXMLEntities(
      atomEntry.summary?._text || 
      atomEntry.summary || 
      atomEntry.content?._text || 
      atomEntry.content || 
      ''
    );
    
    // Handle Atom link element (could be an object with href attribute)
    let link = '';
    if (atomEntry.link) {
      if (typeof atomEntry.link === 'string') {
        link = atomEntry.link;
      } else if (atomEntry.link['@_href']) {
        link = atomEntry.link['@_href'];
      } else if (Array.isArray(atomEntry.link)) {
        // Find the first link with type="text/html" or no type
        const htmlLink = atomEntry.link.find((l: any) => !l['@_type'] || l['@_type'] === 'text/html');
        link = htmlLink?.['@_href'] || atomEntry.link[0]?.['@_href'] || '';
      }
    }
    
    const published = atomEntry.published?._text || atomEntry.published || atomEntry.updated?._text || atomEntry.updated || '';
    const id = atomEntry.id?._text || atomEntry.id || link;

    if (!title || !link) {
      return null;
    }

    let publishedAt: Date;
    try {
      publishedAt = published ? new Date(published) : new Date();
    } catch {
      publishedAt = new Date();
    }

    return {
      id: id || `${source.id}-${Date.now()}-${Math.random()}`,
      sourceId: source.id,
      title: this.sanitizeHTML(title),
      description: this.sanitizeHTML(summary) || undefined,
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
