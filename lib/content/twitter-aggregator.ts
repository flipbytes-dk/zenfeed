import { ContentAggregator, ContentItem, ContentSource, APIResponse, FetchContentOptions, ContentAggregationError } from './types';

interface TwitterUser {
  id: string;
  name: string;
  username: string;
  description: string;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
  profile_image_url?: string;
}

interface TwitterTweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics?: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
  };
  attachments?: {
    media_keys?: string[];
  };
  includes?: {
    users?: TwitterUser[];
    media?: Array<{
      media_key: string;
      type: string;
      url?: string;
      preview_image_url?: string;
    }>;
  };
}

export class TwitterAggregator extends ContentAggregator {
  platform = 'twitter';
  private bearerToken: string | undefined;
  private baseUrl = 'https://api.twitter.com/2';

  constructor(bearerToken?: string) {
    super();
    this.bearerToken = bearerToken || process.env.TWITTER_BEARER_TOKEN;
  }

  async fetchContent(source: ContentSource, options: FetchContentOptions = {}): Promise<APIResponse<ContentItem[]>> {
    try {
      if (!this.bearerToken) {
        return { 
          success: false, 
          error: 'Twitter API bearer token not configured. Please set TWITTER_BEARER_TOKEN environment variable.' 
        };
      }

      const username = this.extractUsername(source);
      if (!username) {
        throw this.createError('INVALID_SOURCE', 'Could not resolve Twitter username', source.id);
      }

      // First get user ID
      const userResponse = await fetch(
        `${this.baseUrl}/users/by/username/${username}?user.fields=description,public_metrics,profile_image_url`,
        {
          headers: {
            'Authorization': `Bearer ${this.bearerToken}`,
            'User-Agent': 'ZenFeed/1.0',
          },
        }
      );

      if (!userResponse.ok) {
        if (userResponse.status === 429) {
          throw this.createError('RATE_LIMIT', 'Twitter API rate limit exceeded', source.id);
        }
        throw this.createError('API_ERROR', `Twitter API error: ${userResponse.status}`, source.id);
      }

      const userData = await userResponse.json();
      if (!userData.data) {
        throw this.createError('INVALID_SOURCE', 'Twitter user not found', source.id);
      }

      const user = userData.data;

      // Get user's tweets
      const maxResults = Math.min(options.limit || 10, 100);
      const tweetsResponse = await fetch(
        `${this.baseUrl}/users/${user.id}/tweets?max_results=${maxResults}&tweet.fields=created_at,public_metrics,attachments&expansions=attachments.media_keys&media.fields=url,preview_image_url,type`,
        {
          headers: {
            'Authorization': `Bearer ${this.bearerToken}`,
            'User-Agent': 'ZenFeed/1.0',
          },
        }
      );

      if (!tweetsResponse.ok) {
        throw this.createError('API_ERROR', `Twitter API error: ${tweetsResponse.status}`, source.id);
      }

      const tweetsData = await tweetsResponse.json();
      const tweets = tweetsData.data || [];

      const contentItems = tweets.map((tweet: TwitterTweet) => 
        this.convertToContentItem(tweet, user, source, tweetsData.includes)
      );

      return {
        success: true,
        data: contentItems,
      };
    } catch (error) {
      if (error instanceof ContentAggregationError) {
        return { success: false, error: error.message };
      }

      console.error('Twitter API error:', error);
      return { 
        success: false, 
        error: `Failed to fetch Twitter content: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  async validateSource(source: ContentSource): Promise<APIResponse<boolean>> {
    try {
      if (!this.bearerToken) {
        return { 
          success: false, 
          error: 'Twitter API bearer token not configured. Please set TWITTER_BEARER_TOKEN environment variable to enable Twitter integration.' 
        };
      }

      const username = this.extractUsername(source);
      if (!username) {
        return { success: false, error: 'Invalid Twitter username' };
      }

      // Try to fetch user info to validate
      const response = await fetch(
        `${this.baseUrl}/users/by/username/${username}`,
        {
          headers: {
            'Authorization': `Bearer ${this.bearerToken}`,
            'User-Agent': 'ZenFeed/1.0',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, error: 'Twitter user not found' };
        }
        if (response.status === 429) {
          return { success: false, error: 'Twitter API rate limit exceeded' };
        }
        return { success: false, error: `Twitter API error: ${response.status}` };
      }

      const data = await response.json();
      return { success: true, data: !!data.data };
    } catch (error) {
      return { 
        success: false, 
        error: `Twitter validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  async getSourceInfo(source: ContentSource): Promise<APIResponse<{ name: string; description?: string; followerCount?: number }>> {
    try {
      if (!this.bearerToken) {
        return { 
          success: false, 
          error: 'Twitter API bearer token not configured' 
        };
      }

      const username = this.extractUsername(source);
      if (!username) {
        throw this.createError('INVALID_SOURCE', 'Could not resolve Twitter username', source.id);
      }

      const response = await fetch(
        `${this.baseUrl}/users/by/username/${username}?user.fields=description,public_metrics`,
        {
          headers: {
            'Authorization': `Bearer ${this.bearerToken}`,
            'User-Agent': 'ZenFeed/1.0',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw this.createError('RATE_LIMIT', 'Twitter API rate limit exceeded', source.id);
        }
        throw this.createError('API_ERROR', `Twitter API error: ${response.status}`, source.id);
      }

      const data = await response.json();
      if (!data.data) {
        throw this.createError('INVALID_SOURCE', 'Twitter user not found', source.id);
      }

      const user = data.data;
      return {
        success: true,
        data: {
          name: user.name,
          description: user.description,
          followerCount: user.public_metrics?.followers_count,
        },
      };
    } catch (error) {
      if (error instanceof ContentAggregationError) {
        return { success: false, error: error.message };
      }
      return { 
        success: false, 
        error: `Failed to get Twitter user info: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private extractUsername(source: ContentSource): string | null {
    if (source.username) {
      return source.username.replace(/^@/, '');
    }

    if (source.url) {
      const match = source.url.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/);
      return match ? match[1] : null;
    }

    return null;
  }

  private convertToContentItem(tweet: TwitterTweet, user: TwitterUser, source: ContentSource, includes?: any): ContentItem {
    // Get media attachments if any
    let thumbnailUrl: string | undefined;
    if (tweet.attachments?.media_keys && includes?.media) {
      const media = includes.media.find((m: any) => 
        tweet.attachments?.media_keys?.includes(m.media_key)
      );
      if (media) {
        thumbnailUrl = media.preview_image_url || media.url;
      }
    }

    return {
      id: tweet.id,
      sourceId: source.id,
      title: tweet.text.length > 100 ? `${tweet.text.substring(0, 100)}...` : tweet.text,
      description: tweet.text,
      url: `https://twitter.com/${user.username}/status/${tweet.id}`,
      thumbnailUrl,
      publishedAt: new Date(tweet.created_at),
      author: {
        name: user.name,
        avatar: user.profile_image_url,
        url: `https://twitter.com/${user.username}`,
      },
      platform: 'twitter',
      contentType: 'text',
      metrics: tweet.public_metrics ? {
        likes: tweet.public_metrics.like_count,
        shares: tweet.public_metrics.retweet_count,
        comments: tweet.public_metrics.reply_count,
      } : undefined,
    };
  }

  private createError(code: ContentAggregationError['code'], message: string, sourceId: string): ContentAggregationError {
    return new ContentAggregationError(message, this.platform, sourceId, code);
  }
}
