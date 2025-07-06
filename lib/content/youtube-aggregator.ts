import { ContentAggregator, ContentItem, ContentSource, APIResponse, FetchContentOptions, ContentAggregationError } from './types';

interface YouTubeVideo {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
    channelTitle: string;
    channelId: string;
  };
  contentDetails?: {
    duration: string; // ISO 8601 format like "PT4M13S"
  };
  statistics?: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
}

interface YouTubeChannel {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default?: { url: string };
    };
  };
  statistics?: {
    subscriberCount: string;
    videoCount: string;
  };
}

interface YouTubeSearchResponse {
  items: Array<{
    id: {
      kind: string;
      videoId?: string;
      channelId?: string;
    };
    snippet: {
      title: string;
      description: string;
      publishedAt: string;
      thumbnails: {
        default?: { url: string };
        medium?: { url: string };
        high?: { url: string };
      };
      channelTitle: string;
      channelId: string;
    };
  }>;
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

export class YouTubeAggregator extends ContentAggregator {
  platform = 'youtube';
  private apiKey: string | undefined;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey || process.env.YOUTUBE_API_KEY;
  }

  async fetchContent(source: ContentSource, options: FetchContentOptions = {}): Promise<APIResponse<ContentItem[]>> {
    try {
      if (!this.apiKey) {
        return { 
          success: false, 
          error: 'YouTube API key not configured. Please set YOUTUBE_API_KEY environment variable.' 
        };
      }

      const channelId = await this.getChannelId(source);
      if (!channelId) {
        throw this.createError('INVALID_SOURCE', 'Could not resolve YouTube channel', source.id);
      }

      const videos = await this.fetchChannelVideos(channelId, options);
      const contentItems = videos.map(video => this.convertToContentItem(video, source));

      return {
        success: true,
        data: contentItems,
      };
    } catch (error) {
      if (error instanceof ContentAggregationError) {
        return { success: false, error: error.message };
      }

      console.error('YouTube API error:', error);
      return { 
        success: false, 
        error: `Failed to fetch YouTube content: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  async validateSource(source: ContentSource): Promise<APIResponse<boolean>> {
    try {
      if (!this.apiKey) {
        return { 
          success: false, 
          error: 'YouTube API key not configured' 
        };
      }

      const channelId = await this.getChannelId(source);
      return { 
        success: true, 
        data: !!channelId 
      };
    } catch (error) {
      return { 
        success: false, 
        error: `Invalid YouTube source: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  async getSourceInfo(source: ContentSource): Promise<APIResponse<{ name: string; description?: string; followerCount?: number }>> {
    try {
      if (!this.apiKey) {
        return { 
          success: false, 
          error: 'YouTube API key not configured' 
        };
      }

      const channelId = await this.getChannelId(source);
      if (!channelId) {
        throw this.createError('INVALID_SOURCE', 'Could not resolve YouTube channel', source.id);
      }

      const channelInfo = await this.fetchChannelInfo(channelId);
      
      return {
        success: true,
        data: {
          name: channelInfo.snippet.title,
          description: channelInfo.snippet.description,
          followerCount: channelInfo.statistics ? parseInt(channelInfo.statistics.subscriberCount) : undefined,
        },
      };
    } catch (error) {
      if (error instanceof ContentAggregationError) {
        return { success: false, error: error.message };
      }
      return { 
        success: false, 
        error: `Failed to get YouTube channel info: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private async getChannelId(source: ContentSource): Promise<string | null> {
    if (!source.url && !source.username) {
      return null;
    }

    // If we have a URL, try to extract channel ID from it
    if (source.url) {
      const channelId = this.extractChannelIdFromUrl(source.url);
      if (channelId) {
        return channelId;
      }
    }

    // If we have a username, try to resolve it
    if (source.username) {
      return this.resolveChannelByUsername(source.username);
    }

    return null;
  }

  private extractChannelIdFromUrl(url: string): string | null {
    // Handle various YouTube URL formats
    const patterns = [
      { pattern: /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/, type: 'channel' },
      { pattern: /youtube\.com\/c\/([a-zA-Z0-9_-]+)/, type: 'custom' },
      { pattern: /youtube\.com\/user\/([a-zA-Z0-9_-]+)/, type: 'user' },
      { pattern: /youtube\.com\/@([a-zA-Z0-9_.-]+)/, type: 'handle' },
    ];

    for (const { pattern, type } of patterns) {
      const match = url.match(pattern);
      if (match) {
        // For channel URLs, the ID is directly usable
        if (type === 'channel') {
          return match[1];
        }
        // For other types, we need to resolve them via search
        // Return null to let resolveChannelByUsername handle it
        return null;
      }
    }

    return null;
  }

  private async resolveChannelByUsername(username: string): Promise<string | null> {
    try {
      const cleanUsername = username.replace(/^@/, '');
      
      // Try searching for the channel
      const response = await fetch(
        `${this.baseUrl}/search?part=snippet&type=channel&q=${encodeURIComponent(cleanUsername)}&key=${this.apiKey}&maxResults=1`
      );

      if (!response.ok) {
        if (response.status === 403) {
          throw this.createError('RATE_LIMIT', 'YouTube API quota exceeded', 'unknown');
        }
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data: YouTubeSearchResponse = await response.json();
      
      if (data.items.length > 0 && data.items[0].id.channelId) {
        return data.items[0].id.channelId;
      }

      return null;
    } catch (error) {
      console.error('Failed to resolve YouTube channel:', error);
      return null;
    }
  }

  private async fetchChannelVideos(channelId: string, options: FetchContentOptions): Promise<YouTubeVideo[]> {
    const maxResults = Math.min(options.limit || 10, 50); // YouTube API allows max 50
    
    // First, get the uploads playlist ID
    const channelResponse = await fetch(
      `${this.baseUrl}/channels?part=contentDetails&id=${channelId}&key=${this.apiKey}`
    );

    if (!channelResponse.ok) {
      if (channelResponse.status === 403) {
        throw this.createError('RATE_LIMIT', 'YouTube API quota exceeded', channelId);
      }
      throw this.createError('API_ERROR', `YouTube API error: ${channelResponse.status}`, channelId);
    }

    const channelData = await channelResponse.json();
    if (!channelData.items || channelData.items.length === 0) {
      throw this.createError('INVALID_SOURCE', 'YouTube channel not found', channelId);
    }

    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

    // Get videos from the uploads playlist
    const playlistResponse = await fetch(
      `${this.baseUrl}/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${this.apiKey}`
    );

    if (!playlistResponse.ok) {
      throw this.createError('API_ERROR', `YouTube API error: ${playlistResponse.status}`, channelId);
    }

    const playlistData = await playlistResponse.json();
    
    if (!playlistData.items) {
      return [];
    }

    // Get detailed video information
    const videoIds = playlistData.items.map((item: any) => item.snippet.resourceId.videoId).join(',');
    
    const videosResponse = await fetch(
      `${this.baseUrl}/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${this.apiKey}`
    );

    if (!videosResponse.ok) {
      throw this.createError('API_ERROR', `YouTube API error: ${videosResponse.status}`, channelId);
    }

    const videosData = await videosResponse.json();
    return videosData.items || [];
  }

  private async fetchChannelInfo(channelId: string): Promise<YouTubeChannel> {
    const response = await fetch(
      `${this.baseUrl}/channels?part=snippet,statistics&id=${channelId}&key=${this.apiKey}`
    );

    if (!response.ok) {
      if (response.status === 403) {
        throw this.createError('RATE_LIMIT', 'YouTube API quota exceeded', channelId);
      }
      throw this.createError('API_ERROR', `YouTube API error: ${response.status}`, channelId);
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      throw this.createError('INVALID_SOURCE', 'YouTube channel not found', channelId);
    }

    return data.items[0];
  }

  private convertToContentItem(video: YouTubeVideo, source: ContentSource): ContentItem {
    const thumbnailUrl = video.snippet.thumbnails.medium?.url || 
                        video.snippet.thumbnails.default?.url || 
                        video.snippet.thumbnails.high?.url;

    return {
      id: video.id,
      sourceId: source.id,
      title: video.snippet.title,
      description: video.snippet.description,
      url: `https://www.youtube.com/watch?v=${video.id}`,
      thumbnailUrl,
      publishedAt: new Date(video.snippet.publishedAt),
      author: {
        name: video.snippet.channelTitle,
        url: `https://www.youtube.com/channel/${video.snippet.channelId}`,
      },
      platform: 'youtube',
      contentType: 'video',
      duration: video.contentDetails ? this.parseDuration(video.contentDetails.duration) : undefined,
      metrics: video.statistics ? {
        views: parseInt(video.statistics.viewCount) || 0,
        likes: parseInt(video.statistics.likeCount) || 0,
        comments: parseInt(video.statistics.commentCount) || 0,
      } : undefined,
    };
  }

  private parseDuration(duration: string): number {
    // Parse ISO 8601 duration format (PT4M13S -> 253 seconds)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return hours * 3600 + minutes * 60 + seconds;
  }

  private createError(code: ContentAggregationError['code'], message: string, sourceId: string): ContentAggregationError {
    return new ContentAggregationError(message, this.platform, sourceId, code);
  }
}
