# Content Aggregation System

This directory contains the content aggregation infrastructure for ZenFeed, enabling integration with multiple content platforms.

## Architecture

### Core Components

- **`types.ts`** - Core interfaces and types for content aggregation
- **`aggregation-service.ts`** - Main orchestration service
- **Platform Aggregators** - Individual platform implementations

### Supported Platforms

| Platform | Status | Requirements | Notes |
|----------|--------|--------------|-------|
| RSS/Atom | ✅ Complete | None | Works out of the box |
| YouTube | ✅ Complete | `YOUTUBE_API_KEY` | Google Cloud API key required |
| Twitter/X | ✅ Complete | `TWITTER_BEARER_TOKEN` | Twitter API v2 Bearer Token |
| Instagram | 🔄 Limited | `INSTAGRAM_ACCESS_TOKEN` | Instagram Basic Display API |
| Newsletter | ✅ Complete | None | Uses RSS-like feeds |

## Environment Variables

```bash
# Optional: YouTube Data API v3
YOUTUBE_API_KEY=your_youtube_api_key

# Optional: Twitter API v2
TWITTER_BEARER_TOKEN=your_twitter_bearer_token

# Optional: Instagram Basic Display API
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token
```

## API Endpoints

### Validation
```
POST /api/content-sources/validate
```
Validates a content source configuration and returns source information.

**Request Body:**
```json
{
  "type": "youtube|instagram|twitter|rss|newsletter",
  "name": "Source Name",
  "url": "https://example.com/feed",
  "username": "optional_username"
}
```

**Response:**
```json
{
  "valid": true,
  "sourceInfo": {
    "name": "Channel/User Name",
    "description": "Description",
    "followerCount": 12345
  }
}
```

### Content Fetching
```
POST /api/content-sources/fetch
```
Fetches content from multiple sources with priority-based aggregation.

**Request Body:**
```json
{
  "sources": [
    {
      "id": "source1",
      "type": "youtube",
      "name": "Example Channel",
      "url": "https://youtube.com/@example",
      "priority": "high"
    }
  ],
  "options": {
    "limit": 20,
    "includeMetrics": true
  }
}
```

## Platform-Specific Notes

### YouTube
- Requires Google Cloud Console project with YouTube Data API v3 enabled
- Rate limits: 10,000 quota units per day (default)
- Supports channels, usernames, and direct URLs
- Returns video metadata, thumbnails, and engagement metrics

### Twitter/X
- Requires Twitter Developer Account and App
- Uses Twitter API v2 with Bearer Token authentication
- Rate limits: 300 requests per 15-minute window (user lookup)
- Returns tweet text, media, and engagement metrics

### Instagram
- **IMPORTANT:** Instagram Basic Display API only allows access to user's own content
- For business use cases, Instagram Graph API would be required
- Requires Facebook Developer Account and App Review
- Limited to authenticated user's media only

### RSS/Atom
- No authentication required
- Supports standard RSS 2.0 and Atom 1.0 feeds
- 30-second timeout for feed fetching
- Automatic format detection and parsing

## Usage Examples

### Basic Content Aggregation
```typescript
import { contentAggregationService } from '@/lib/content/aggregation-service';

const sources = [
  {
    id: '1',
    type: 'rss',
    name: 'Example Blog',
    url: 'https://example.com/feed.xml',
    priority: 'high',
    active: true
  }
];

const result = await contentAggregationService.aggregateAllContent(sources, {
  limit: 10
});

console.log(result.items); // ContentItem[]
```

### Priority-Based Aggregation
```typescript
const result = await contentAggregationService.aggregateContentWithPriority(sources, {
  limit: 20
});
// Returns content weighted by source priority
```

### Single Source Validation
```typescript
const validation = await contentAggregationService.validateSource({
  id: 'temp',
  type: 'youtube',
  name: 'Test',
  url: 'https://youtube.com/@example',
  priority: 'medium',
  active: true
});

if (validation.success) {
  console.log('Source is valid');
}
```

## Error Handling

The system includes comprehensive error handling with specific error codes:

- `RATE_LIMIT` - API rate limit exceeded
- `INVALID_SOURCE` - Source configuration invalid
- `API_ERROR` - Platform API returned error
- `NETWORK_ERROR` - Network connectivity issues
- `PARSE_ERROR` - Content parsing failed

## Rate Limiting

Each platform aggregator tracks rate limits and prevents excessive API calls:

```typescript
const rateLimitInfo = contentAggregationService.getRateLimitInfo('youtube');
if (rateLimitInfo && rateLimitInfo.remaining === 0) {
  console.log(`Rate limited until ${rateLimitInfo.reset}`);
}
```

## Extending the System

To add a new platform:

1. Create a new aggregator class extending `ContentAggregator`
2. Implement the three required methods:
   - `fetchContent()`
   - `validateSource()`
   - `getSourceInfo()`
3. Add the aggregator to `ContentAggregationService.initializeAggregators()`
4. Update the source types in the frontend

Example:
```typescript
export class MyPlatformAggregator extends ContentAggregator {
  platform = 'myplatform';
  
  async fetchContent(source: ContentSource, options?: FetchContentOptions): Promise<APIResponse<ContentItem[]>> {
    // Implementation
  }
  
  async validateSource(source: ContentSource): Promise<APIResponse<boolean>> {
    // Implementation
  }
  
  async getSourceInfo(source: ContentSource): Promise<APIResponse<{name: string; description?: string}>> {
    // Implementation
  }
}
```
