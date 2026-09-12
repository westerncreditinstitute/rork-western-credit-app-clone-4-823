#!/bin/bash

# AI Agent Dispute Context - Automated Testing Script
# Usage: ./test-disputes.sh [API_URL] [TEST_USER_ID] [AGENT_ID]

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${1:-http://localhost:3000}"
TEST_USER_ID="${2:-test-user}"
AGENT_ID="${3:-default-agent}"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}AI Agent Dispute Context Testing${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "API URL: ${YELLOW}$API_URL${NC}"
echo -e "Test User: ${YELLOW}$TEST_USER_ID${NC}"
echo -e "Agent: ${YELLOW}$AGENT_ID${NC}"
echo ""

# Helper function to print test result
print_result() {
  local test_name="$1"
  local passed="$2"
  
  if [ "$passed" = "true" ]; then
    echo -e "${GREEN}✓${NC} $test_name"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗${NC} $test_name"
    ((TESTS_FAILED++))
  fi
}

# Test 1: Connection
echo -e "${BLUE}[Test 1]${NC} Verifying API connection..."
if curl -s -f "$API_URL/health" > /dev/null 2>&1; then
  print_result "API Connection" "true"
else
  print_result "API Connection" "false"
  echo "API not responding at $API_URL"
  exit 1
fi
echo ""

# Test 2: No Disputes Scenario
echo -e "${BLUE}[Test 2]${NC} Testing with clean user (no disputes)..."
RESPONSE=$(curl -s -X POST "$API_URL/trpc/aiAgents.chat" \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "userId": "'$TEST_USER_ID'",
      "agentId": "'$AGENT_ID'",
      "message": "What disputes do I have?",
      "history": []
    }
  }')

if echo "$RESPONSE" | jq -e '.result.data.response' > /dev/null 2>&1; then
  print_result "No Disputes Response" "true"
  RESPONSE_TEXT=$(echo "$RESPONSE" | jq -r '.result.data.response')
  echo "  Response: ${RESPONSE_TEXT:0:80}..."
else
  print_result "No Disputes Response" "false"
  echo "  Error: $RESPONSE"
fi
echo ""

# Test 3: Response Time Baseline
echo -e "${BLUE}[Test 3]${NC} Measuring response time..."
START_TIME=$(date +%s%N)
curl -s -X POST "$API_URL/trpc/aiAgents.chat" \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "userId": "'$TEST_USER_ID'",
      "agentId": "'$AGENT_ID'",
      "message": "What is my credit status?",
      "history": []
    }
  }' > /dev/null 2>&1
END_TIME=$(date +%s%N)

RESPONSE_TIME=$((($END_TIME - $START_TIME) / 1000000))
RESPONSE_TIME_MS=$(echo "scale=0; $RESPONSE_TIME / 1000" | bc)

if [ "$RESPONSE_TIME_MS" -lt 3000 ]; then
  print_result "Response Time < 3000ms" "true"
  echo "  Response time: ${RESPONSE_TIME_MS}ms"
else
  print_result "Response Time < 3000ms" "false"
  echo "  Response time: ${RESPONSE_TIME_MS}ms (slow)"
fi
echo ""

# Test 4: Tool Availability
echo -e "${BLUE}[Test 4]${NC} Checking tool availability..."
RESPONSE=$(curl -s -X POST "$API_URL/trpc/aiAgents.chat" \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "userId": "'$TEST_USER_ID'",
      "agentId": "'$AGENT_ID'",
      "message": "Use the get_disputes tool to retrieve my disputes",
      "history": []
    }
  }')

if echo "$RESPONSE" | jq -e '.result.data' > /dev/null 2>&1; then
  print_result "Tool Execution" "true"
else
  print_result "Tool Execution" "false"
fi
echo ""

# Test 5: Error Handling
echo -e "${BLUE}[Test 5]${NC} Testing error handling..."
RESPONSE=$(curl -s -X POST "$API_URL/trpc/aiAgents.chat" \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "userId": "invalid-user",
      "agentId": "'$AGENT_ID'",
      "message": "Hello",
      "history": []
    }
  }')

if echo "$RESPONSE" | jq -e '.' > /dev/null 2>&1; then
  print_result "Error Handling" "true"
else
  print_result "Error Handling" "false"
fi
echo ""

# Summary
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ "$TESTS_FAILED" -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
