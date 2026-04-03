#!/bin/bash

# Run all test suites in headless chromium and extract results

set -e

TESTS=(
    "tests/unit/test-combat-styles.html"
    "tests/unit/test-folk-magic-tooltips.html"
    "tests/integration/test-terminology.html"
    "tests/integration/test-export-buttons.html"
)

echo "==============================================="
echo "Mythras CharGen - Running All Tests"
echo "==============================================="
echo ""

TOTAL_PASS=0
TOTAL_FAIL=0
FAILED_SUITES=0

for test in "${TESTS[@]}"; do
    TEST_NAME=$(basename "$test" .html)
    echo "Running: $TEST_NAME"
    echo "-----------------------------------------------"

    # Run chromium with the test page
    RESULT=$(chromium --headless --disable-gpu --no-sandbox \
        --virtual-time-budget=10000 \
        --dump-dom \
        "http://localhost:8888/$test" 2>/dev/null | \
        grep -o 'id="summary"[^>]*>[^<]*' | \
        sed 's/id="summary"[^>]*>//' | \
        head -1)

    if [ -z "$RESULT" ] || echo "$RESULT" | grep -q "Loading"; then
        echo "Result: TIMEOUT - Test did not complete"
        RESULT="Total: 0 | Pass: 0 | Fail: 1"
        ((TOTAL_FAIL++))
        ((FAILED_SUITES++))
    else
        echo "Result: $RESULT"

        # Extract pass/fail counts using sed instead of grep -P
        PASS=$(echo "$RESULT" | sed -n 's/.*Pass:[[:space:]]*\([0-9]*\).*/\1/p')
        FAIL=$(echo "$RESULT" | sed -n 's/.*Fail:[[:space:]]*\([0-9]*\).*/\1/p')

        # Default to 0 if not found
        PASS=${PASS:-0}
        FAIL=${FAIL:-0}

        TOTAL_PASS=$((TOTAL_PASS + PASS))
        TOTAL_FAIL=$((TOTAL_FAIL + FAIL))

        if [ "$FAIL" -gt 0 ]; then
            ((FAILED_SUITES++))
        fi
    fi

    echo ""
done

echo "==============================================="
echo "OVERALL RESULTS"
echo "==============================================="
echo "Total Tests: $((TOTAL_PASS + TOTAL_FAIL))"
echo "Passed: $TOTAL_PASS"
echo "Failed: $TOTAL_FAIL"
echo "Failed Suites: $FAILED_SUITES / ${#TESTS[@]}"
echo "==============================================="

if [ $TOTAL_FAIL -gt 0 ]; then
    echo "❌ Some tests failed"
    exit 1
else
    echo "✅ All tests passed!"
    exit 0
fi
