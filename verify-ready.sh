#!/bin/bash

# InvoiceFlow - Pre-Deployment Verification Script
# Run this before deploying to production

echo "🔍 InvoiceFlow - Pre-Deployment Verification"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check Node.js
echo "📦 Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓${NC} Node.js installed: $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not found. Install Node.js 8.11+"
    ERRORS=$((ERRORS+1))
fi
echo ""

# Check npm
echo "📦 Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓${NC} npm installed: $NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm not found"
    ERRORS=$((ERRORS+1))
fi
echo ""

# Check if package.json exists
echo "📄 Checking package.json..."
if [ -f "package.json" ]; then
    echo -e "${GREEN}✓${NC} package.json found"
else
    echo -e "${RED}✗${NC} package.json not found"
    ERRORS=$((ERRORS+1))
fi
echo ""

# Check if node_modules exists
echo "📦 Checking dependencies..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules found"
else
    echo -e "${YELLOW}⚠${NC} node_modules not found. Run: npm install --legacy-peer-deps"
    WARNINGS=$((WARNINGS+1))
fi
echo ""

# Check .env file
echo "🔐 Checking environment configuration..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env file found"

    # Check for required variables
    if grep -q "STRIPE_SECRET_KEY" .env; then
        if grep -q "STRIPE_SECRET_KEY=sk_test_" .env || grep -q "STRIPE_SECRET_KEY=sk_live_" .env; then
            echo -e "${GREEN}✓${NC} STRIPE_SECRET_KEY configured"
        else
            echo -e "${RED}✗${NC} STRIPE_SECRET_KEY is empty or invalid"
            ERRORS=$((ERRORS+1))
        fi
    else
        echo -e "${RED}✗${NC} STRIPE_SECRET_KEY not found in .env"
        ERRORS=$((ERRORS+1))
    fi

    if grep -q "STRIPE_WEBHOOK_SECRET" .env; then
        if grep -q "STRIPE_WEBHOOK_SECRET=whsec_" .env; then
            echo -e "${GREEN}✓${NC} STRIPE_WEBHOOK_SECRET configured"
        else
            echo -e "${YELLOW}⚠${NC} STRIPE_WEBHOOK_SECRET may not be configured yet"
            WARNINGS=$((WARNINGS+1))
        fi
    else
        echo -e "${YELLOW}⚠${NC} STRIPE_WEBHOOK_SECRET not found (needed for webhooks)"
        WARNINGS=$((WARNINGS+1))
    fi
else
    echo -e "${RED}✗${NC} .env file not found. Copy .env.example to .env"
    ERRORS=$((ERRORS+1))
fi
echo ""

# Check critical files
echo "📁 Checking critical files..."
CRITICAL_FILES=(
    "models/invoice.js"
    "models/client.js"
    "models/subscription.js"
    "routes/invoice.js"
    "pages/dashboard.js"
    "pages/create-invoice.js"
    "pages/pricing.js"
    "pages/index.js"
    "START_HERE.md"
    "QUICKSTART.md"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file missing"
        ERRORS=$((ERRORS+1))
    fi
done
echo ""

# Check deployment configs
echo "🚀 Checking deployment configs..."
DEPLOY_FILES=("Procfile" "railway.json" "render.yaml")
for file in "${DEPLOY_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${YELLOW}⚠${NC} $file missing (optional)"
    fi
done
echo ""

# Check documentation
echo "📖 Checking documentation..."
DOCS=("START_HERE.md" "QUICKSTART.md" "DEPLOYMENT_GUIDE.md" "STRIPE_SETUP_GUIDE.md" "TESTING_CHECKLIST.md" "LAUNCH_PLAN.md")
for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✓${NC} $doc"
    else
        echo -e "${RED}✗${NC} $doc missing"
        ERRORS=$((ERRORS+1))
    fi
done
echo ""

# Summary
echo "=============================================="
echo "📊 VERIFICATION SUMMARY"
echo "=============================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL CHECKS PASSED!${NC}"
    echo ""
    echo "🎉 Your InvoiceFlow SaaS is ready to deploy!"
    echo ""
    echo "Next steps:"
    echo "1. Read START_HERE.md"
    echo "2. Follow QUICKSTART.md to deploy"
    echo "3. Set up Stripe (STRIPE_SETUP_GUIDE.md)"
    echo "4. Test everything (TESTING_CHECKLIST.md)"
    echo "5. Launch! (LAUNCH_PLAN.md)"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    echo ""
    echo "You can proceed, but review the warnings above."
    echo "Most warnings can be fixed after deployment."
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s) found${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    fi
    echo ""
    echo "❌ Please fix the errors above before deploying."
    echo ""
    echo "Common fixes:"
    echo "- Run: npm install --legacy-peer-deps"
    echo "- Copy: cp .env.example .env"
    echo "- Add Stripe keys to .env file"
    exit 1
fi
