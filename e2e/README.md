# End-to-End Testing with Playwright

This directory contains end-to-end tests for the bmk-next application using Playwright.

## Prerequisites

- Node.js (version 18 or higher)
- The main application running on `http://localhost:5173`

## Installation

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npm run install-browsers
```

## Running Tests

### Basic test run
```bash
npm test
```

### Run tests in headed mode (see browser)
```bash
npm run test:headed
```

### Run tests with UI mode
```bash
npm run test:ui
```

### Debug tests
```bash
npm run test:debug
```

### View test report
```bash
npm run test:report
```

## Test Structure

- `tests/auth/` - Authentication related tests
  - `login.spec.ts` - Login functionality tests

## Configuration

The Playwright configuration is in `playwright.config.ts`. Key settings:

- **Base URL**: `http://localhost:5173`
- **Browsers**: Chrome, Firefox, Safari
- **Web Server**: Automatically starts the dev server before tests
- **Reports**: HTML reports are generated automatically

## Writing New Tests

1. Create test files with `.spec.ts` extension in the `tests/` directory
2. Use the `test` and `expect` functions from `@playwright/test`
3. Follow the existing patterns for page interactions

Example:
```typescript
import { test, expect } from '@playwright/test';

test('example test', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Expected Title');
});
```

## Current Tests

### Login Tests
- ✅ Successful login with admin/1234 credentials
- ✅ Login form elements visibility
- ✅ Empty form submission handling

The tests assume the application has a login endpoint that accepts:
- Username: `admin`
- Password: `1234` 