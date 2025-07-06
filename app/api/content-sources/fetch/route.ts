import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/utils';
import { contentAggregationService } from '@/lib/content/aggregation-service';
import { ContentSource } from '@/lib/content/types';

export async function POST(request: NextRequest) {
  try {
    const session = getAuthenticatedUser(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sources, options = {} } = body;

    if (!sources || !Array.isArray(sources)) {
      return NextResponse.json({ error: 'Sources array is required' }, { status: 400 });
    }

    // Validate that all sources have required fields
    for (const source of sources) {
      if (!source.type || !source.id) {
        return NextResponse.json({ 
          error: 'Each source must have type and id fields' 
        }, { status: 400 });
      }
    }

    // Set default options
    const fetchOptions = {
      limit: 10,
      includeMetrics: false,
      ...options,
    };

    // Limit the number of items per request to prevent abuse
    if (fetchOptions.limit > 100) {
      fetchOptions.limit = 100;
    }

    // Fetch content from all sources
    const results = await contentAggregationService.aggregateAllContent(sources, fetchOptions);

    return NextResponse.json({
      success: true,
      items: results.items,
      totalItems: results.items.length,
      errors: results.errors,
      totalSources: results.totalSources,
      successfulSources: results.successfulSources,
      supportedPlatforms: contentAggregationService.getAvailablePlatforms(),
    });

  } catch (error) {
    console.error('Content fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content from sources' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = getAuthenticatedUser(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const sourceId = url.searchParams.get('sourceId');
    const type = url.searchParams.get('type');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    if (!sourceId || !type) {
    return NextResponse.json({ 
    error: 'sourceId and type parameters are required' 
    }, { status: 400 });
    }

    // Validate source type
    const validTypes = ['youtube', 'instagram', 'twitter', 'rss', 'newsletter', 'category'];
    if (!validTypes.includes(type)) {
    return NextResponse.json({ 
      error: 'Invalid source type' 
    }, { status: 400 });
  }

  // Create a temporary source object
  const tempSource: ContentSource = {
    id: sourceId,
    type: type as ContentSource['type'],
      name: 'Test Source',
      url: url.searchParams.get('url') || undefined,
      username: url.searchParams.get('username') || undefined,
      priority: 'medium',
      active: true,
    };

    // Fetch content from the single source
    const result = await contentAggregationService.fetchContentFromSource(tempSource, {
      limit: Math.min(limit, 50), // Max 50 items for single source
    });

    return NextResponse.json({
      success: result.success,
      items: result.items || [],
      error: result.error,
      rateLimit: result.rateLimit,
    });

  } catch (error) {
    console.error('Single source content fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content from source' },
      { status: 500 }
    );
  }
}
