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
    const { type, url, username, name } = body;

    if (!type) {
      return NextResponse.json({ error: 'Source type is required' }, { status: 400 });
    }

    // Create a temporary source object for validation
    const tempSource: ContentSource = {
      id: 'temp-validation',
      type,
      name: name || 'Validation Source',
      url,
      username,
      priority: 'medium',
      active: true,
    };

    // Validate the source
    const validationResult = await contentAggregationService.validateSource(tempSource);

    if (!validationResult.success) {
      return NextResponse.json({
        valid: false,
        error: validationResult.error,
      }, { status: 200 });
    }

    // If validation passes, try to get source info
    let sourceInfo = null;
    try {
      const infoResult = await contentAggregationService.getSourceInfo(tempSource);
      if (infoResult.success) {
        sourceInfo = infoResult.data;
      }
    } catch (error) {
      console.warn('Failed to get source info during validation:', error);
      // Don't fail validation if we can't get info
    }

    return NextResponse.json({
      valid: true,
      sourceInfo,
      supportedPlatforms: contentAggregationService.getAvailablePlatforms(),
    });

  } catch (error) {
    console.error('Content source validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate content source' },
      { status: 500 }
    );
  }
}
