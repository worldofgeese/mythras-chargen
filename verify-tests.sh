#!/bin/bash

# Verify test harness is working by checking test pages load correctly

set -e

BASE_URL="http://localhost:8765"

echo "=== Mythras CharGen Test Verification ==="
echo ""

# Check if server is running
if ! curl -s -o /dev/null "${BASE_URL}/index.html"; then
    echo "ERROR: HTTP server not running on port 8765"
    echo "Start server with: python3 -m http.server 8765"
    exit 1
fi

echo "✓ HTTP server is running"
echo ""

# Check each test page loads
TESTS=(
    "tests/unit/test-combat-styles.html"
    "tests/unit/test-folk-magic-tooltips.html"
    "tests/integration/test-terminology.html"
    "tests/integration/test-export-buttons.html"
)

for test in "${TESTS[@]}"; do
    printf "Checking %-50s ... " "$test"
    if curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/${test}" | grep -q "200"; then
        echo "✓ OK"
    else
        echo "✗ FAIL"
        exit 1
    fi
done

echo ""
echo "✓ All test pages are accessible"
echo ""
echo "To run tests, open in browser:"
echo "  ${BASE_URL}/tests/test-runner.html"
echo ""
echo "Individual test URLs:"
for test in "${TESTS[@]}"; do
    echo "  ${BASE_URL}/${test}"
done
echo ""
