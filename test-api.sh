#!/bin/bash
# API Testing Script for ZenFeed Content Aggregation

echo "🧪 Testing ZenFeed Content Aggregation APIs"
echo "=========================================="

BASE_URL="http://localhost:3000"

echo
echo "📋 1. Testing RSS Feed Validation"
echo "--------------------------------"
curl -X POST "${BASE_URL}/api/content-sources/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "rss",
    "url": "https://feeds.npr.org/1001/rss.xml",
    "name": "NPR News"
  }' | jq '.'

echo
echo "📋 2. Testing YouTube Channel Validation"
echo "--------------------------------------"
curl -X POST "${BASE_URL}/api/content-sources/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "youtube",
    "username": "TechCrunch",
    "name": "TechCrunch YouTube"
  }' | jq '.'

echo
echo "📋 3. Testing RSS Content Fetching"
echo "--------------------------------"
curl -X GET "${BASE_URL}/api/content-sources/fetch?sourceId=test-rss&type=rss&url=https://feeds.npr.org/1001/rss.xml&limit=3" | jq '.'

echo
echo "📋 4. Testing Invalid Source Type (Should Fail)"
echo "----------------------------------------------"
curl -X POST "${BASE_URL}/api/content-sources/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "invalid",
    "url": "https://example.com",
    "name": "Invalid Source"
  }' | jq '.'

echo
echo "🎯 Testing Complete!"
echo "==================="
echo "Note: YouTube/Twitter/Instagram tests require API keys"
echo "Set environment variables: YOUTUBE_API_KEY, TWITTER_BEARER_TOKEN, INSTAGRAM_ACCESS_TOKEN"
