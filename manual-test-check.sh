#!/bin/bash

# Manual test checker
# Opens test pages and shows URLs for manual verification

echo "=== Mythras CharGen Test Harness ==="
echo ""
echo "Please open the following URLs in your browser to verify tests:"
echo ""
echo "Unit Tests:"
echo "  http://localhost:8765/tests/unit/test-combat-styles.html"
echo "  http://localhost:8765/tests/unit/test-folk-magic-tooltips.html"
echo ""
echo "Integration Tests:"
echo "  http://localhost:8765/tests/integration/test-terminology.html"
echo "  http://localhost:8765/tests/integration/test-export-buttons.html"
echo ""
echo "Each page should display:"
echo "  - Test summary with Pass/Fail counts"
echo "  - Individual test results"
echo "  - Green for all pass, Red for failures"
echo ""
