#!/bin/bash
# API Testing Script for ZenFeed Content Aggregation

set -e

# Dependency checks
if ! command -v curl &> /dev/null; then
    echo "❌ Error: curl is required but not installed"
    exit 1
fi
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq is required but not installed"
    exit 1
fi

BASE_URL="${BASE_URL:-http://localhost:3000}"
FAILED_TESTS=0

function run_test() {
    local test_name="$1"
    local curl_command="$2"
    echo "📋 Testing: $test_name"
    echo "$(printf '=%.0s' {1..40})"
    if output=$(eval "$curl_command" 2>&1); then
        echo "$output"
        echo -e "\033[0;32m✅ Test passed\033[0m"
    else
        echo -e "\033[0;31m❌ Test failed: $output\033[0m"
        FAILED_TESTS=$((FAILED_TESTS+1))
    fi
    echo
}

echo "🧪 Testing ZenFeed Content Aggregation APIs"
echo "Base URL: $BASE_URL"
echo "$(printf '=%.0s' {1..50})"

run_test "RSS Feed Validation" \
  "curl -s -X POST \"$BASE_URL/api/content-sources/validate\" -H 'Content-Type: application/json' -d '{\"type\": \"rss\", \"url\": \"https://feeds.npr.org/1001/rss.xml\", \"name\": \"NPR News\"}' | jq '.'"

run_test "YouTube Channel Validation" \
  "curl -s -X POST \"$BASE_URL/api/content-sources/validate\" -H 'Content-Type: application/json' -d '{\"type\": \"youtube\", \"username\": \"TechCrunch\", \"name\": \"TechCrunch YouTube\"}' | jq '.'"

run_test "RSS Content Fetching" \
  "curl -s -X GET \"$BASE_URL/api/content-sources/fetch?sourceId=test-rss&type=rss&url=https://feeds.npr.org/1001/rss.xml&limit=3\" | jq '.'"

run_test "Invalid Source Type (Should Fail)" \
  "curl -s -X POST \"$BASE_URL/api/content-sources/validate\" -H 'Content-Type: application/json' -d '{\"type\": \"invalid\", \"url\": \"https://example.com\", \"name\": \"Invalid Source\"}' | jq '.'"

run_test "Check Connected Accounts" \
  "curl -s -X GET \"$BASE_URL/api/auth/connected-accounts\" | jq '.'"

echo "🎯 Testing Complete!"
echo "==================="
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\033[0;32m✅ All tests passed!\033[0m"
    exit 0
else
    echo -e "\033[0;31m❌ $FAILED_TESTS test(s) failed\033[0m"
    exit 1
fi
