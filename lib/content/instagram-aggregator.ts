import { ContentAggregator, ContentItem, ContentSource, APIResponse, FetchContentOptions, ContentAggregationError } from './types';

interface InstagramUser {
  id: string;
  username: string;
  account_type: string;
  media_count: number;
  followers_count?: number;
}

interface InstagramMedia {
  id: string;
  caption: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

export class InstagramAggregator extends ContentAggregator {
  platform = 'instagram';
  private accessToken: string | undefined;
  private baseUrl = 'https://graph.instagram.com';

  constructor(accessToken?: string) {
    super();
    this.accessToken = accessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
  }

  async fetchContent(source: ContentSource, options: FetchContentOptions = {}): Promise<APIResponse<ContentItem[]>> {
    try {
      if (!this.accessToken) {
        return { 
          success: false, 
          error: 'Instagram access token not configured. Instagram Basic Display API requires user authentication and approval.' 
        };
      }

      // Note: Instagram Basic Display API only allows access to user's own media
      // For business accounts, Instagram Graph API would be needed
      const limit = Math.min(options.limit || 10, 25); // Instagram API limit

      const response = await fetch(
        `${this.baseUrl}/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=${limit}&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw this.createError('RATE_LIMIT', 'Instagram API rate limit exceeded', source.id);
        }
        throw this.createError('API_ERROR', `Instagram API error: ${response.status}`, source.id);
      }

      const data = await response.json();
      const media = data.data || [];

      const contentItems = await Promise.all(
        media.map((item: InstagramMedia) => this.convertToContentItem(item, source))
      );

      return {
        success: true,
        data: contentItems,
      };
    } catch (error) {
      if (error instanceof ContentAggregationError) {
        return { success: false, error: error.message };
      }

      console.error('Instagram API error:', error);
      return { 
        success: false, 
        error: `Failed to fetch Instagram content: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  async validateSource(source: ContentSource): Promise<APIResponse<boolean>> {
    try {
      if (!this.accessToken) {
        return { 
          success: false, 
          error: 'Instagram API integration requires access token configuration. Instagram Basic Display API requires user authentication and app approval by Meta.' 
        };
      }

      // For Instagram, we can only validate by checking if the access token works
      const response = await fetch(
        `${this.baseUrl}/me?fields=id,username&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'Invalid Instagram access token' };
        }
        if (response.status === 429) {
          return { success: false, error: 'Instagram API rate limit exceeded' };
        }
        return { success: false, error: `Instagram API error: ${response.status}` };
      }

      // Note: We can't validate arbitrary usernames without their permission
      // This is a limitation of Instagram's API privacy model
      return { 
        success: true, 
        data: true,
        // Return info about the limitation
      };
    } catch (error) {
      return { 
        success: false, 
        error: `Instagram validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  async getSourceInfo(source: ContentSource): Promise<APIResponse<{ name: string; description?: string; followerCount?: number }>> {
    try {
      if (!this.accessToken) {
        return { 
          success: false, 
          error: 'Instagram access token not configured' 
        };
      }

      const response = await fetch(
        `${this.baseUrl}/me?fields=id,username,account_type,media_count&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw this.createError('RATE_LIMIT', 'Instagram API rate limit exceeded', source.id);
        }
        throw this.createError('API_ERROR', `Instagram API error: ${response.status}`, source.id);
      }

      const user: InstagramUser = await response.json();
      
      return {
        success: true,
        data: {
          name: user.username,
          description: `${user.account_type} account with ${user.media_count} posts`,
          followerCount: user.followers_count,
        },
      };
    } catch (error) {
      if (error instanceof ContentAggregationError) {
        return { success: false, error: error.message };
      }
      return { 
        success: false, 
        error: `Failed to get Instagram user info: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private async convertToContentItem(media: InstagramMedia, source: ContentSource): Promise<ContentItem> {
    return {
      id: media.id,
      title: media.caption ? (media.caption.length > 100 ? `${media.caption.substring(0, 100)}...` : media.caption) : 'Instagram Post',
      description: media.caption,
      url: media.permalink,
      thumbnailUrl: media.media_type === 'VIDEO' ? media.thumbnail_url : media.media_url,
      publishedAt: new Date(media.timestamp),
      author: {
        name: source.username || 'Instagram User',
        url: source.url,
      },
      platform: 'instagram',
      contentType: media.media_type === 'VIDEO' ? 'video' : 'image',
      metrics: {
        likes: media.like_count || 0,
        comments: media.comments_count || 0,
      },
    };
  }

  private createError(code: ContentAggregationError['code'], message: string, sourceId: string): ContentAggregationError {
    return new ContentAggregationError(message, this.platform, sourceId, code);
  }
}
