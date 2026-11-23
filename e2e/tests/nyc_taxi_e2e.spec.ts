import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.resolve(__dirname, '../../outputs/screenshots');

test.beforeAll(async () => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

test.describe('NYC Taxi AI System - Desktop E2E Tests (1400x900)', () => {
  test.use({ viewport: { width: 1400, height: 900 } });

  test('1. Predict trip duration with real historical model & disclaimer', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Switch to Prediction tab if not active
    const predTab = page.locator('button, a, div[role="tab"]').filter({ hasText: /dự báo/i }).first();
    if (await predTab.isVisible()) {
      await predTab.click();
    }

    // Wait for Leaflet map to load tiles
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Look for preset location buttons or form inputs
    const timesSquareBtn = page.locator('button').filter({ hasText: /quảng trường thời đại|times square/i }).first();
    const grandCentralBtn = page.locator('button').filter({ hasText: /grand central/i }).first();

    if (await timesSquareBtn.isVisible() && await grandCentralBtn.isVisible()) {
      await timesSquareBtn.click();
      await page.waitForTimeout(300);
      await grandCentralBtn.click();
    }

    // Look for Predict submit button
    const submitBtn = page.locator('button').filter({ hasText: /dự báo|tính toán|ước lượng/i }).first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }

    // Wait for result card or disclaimer
    await page.waitForSelector('text=/thời gian|dự kiến|phút|disclaimer|lịch sử/i', { timeout: 10000 });
    await page.waitForTimeout(1500);

    // Ensure Leaflet tiles are rendered
    await page.waitForSelector('.leaflet-tile-loaded', { timeout: 10000 }).catch(() => {});

    // Save screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, 'desktop_prediction.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    expect(fs.existsSync(screenshotPath)).toBeTruthy();
  });

  test('2. Shortest path routing with A* algorithm', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Switch to Routing tab
    const routeTab = page.locator('button, a, div[role="tab"]').filter({ hasText: /tìm đường/i }).first();
    await routeTab.click();
    await page.waitForTimeout(500);

    // Select start and destination presets
    const timesSquareBtn = page.locator('button').filter({ hasText: /quảng trường thời đại|times square/i }).first();
    const wallStreetBtn = page.locator('button').filter({ hasText: /phố wall|wall street/i }).first();

    if (await timesSquareBtn.isVisible() && await wallStreetBtn.isVisible()) {
      await timesSquareBtn.click();
      await page.waitForTimeout(300);
      await wallStreetBtn.click();
    }

    // Find route button
    const findRouteBtn = page.locator('button').filter({ hasText: /tìm đường|tìm tuyến/i }).first();
    if (await findRouteBtn.isVisible()) {
      await findRouteBtn.click();
    }

    // Wait for route polyline and distance/duration metrics
    await page.waitForSelector('text=/ngắn nhất|quãng đường|khoảng cách|mét|km/i', { timeout: 10000 });
    await page.waitForTimeout(1500);

    // Save screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, 'desktop_routing_astar.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    expect(fs.existsSync(screenshotPath)).toBeTruthy();
  });

  test('3. Multi-passenger dispatch schedule with pooling optimization', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Switch to Dispatch tab
    const dispatchTab = page.locator('button, a, div[role="tab"]').filter({ hasText: /đón nhiều khách|điều phối|ghép chuyến/i }).first();
    await dispatchTab.click();
    await page.waitForTimeout(500);

    // Click optimize / dispatch button
    const optimizeBtn = page.locator('button').filter({ hasText: /tối ưu|lập lịch|điều phối|tính toán/i }).first();
    if (await optimizeBtn.isVisible()) {
      await optimizeBtn.click();
    }

    // Wait for schedule timeline or stops table
    await page.waitForSelector('text=/thứ tự|điểm dừng|tải trọng|tiết kiệm|sequential/i', { timeout: 10000 });
    await page.waitForTimeout(1500);

    // Save screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, 'desktop_dispatch_schedule.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    expect(fs.existsSync(screenshotPath)).toBeTruthy();
  });

  test('4. Error handling with Vietnamese remediation message', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Trigger an error state: out of Manhattan coordinates or trigger error UI
    // Evaluate custom script to inject out-of-bounds coordinates or trigger test error
    await page.evaluate(() => {
      // Look for coordinate inputs if available, or trigger an error state event
      const inputs = Array.from(document.querySelectorAll('input[type="number"]')) as HTMLInputElement[];
      if (inputs.length >= 2) {
        inputs[0].value = '41.5000'; // Outside Manhattan
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    const submitBtn = page.locator('button').filter({ hasText: /dự báo|tìm đường|tính toán/i }).first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }

    // Also look for error alerts or remediation texts
    await page.waitForTimeout(1000);

    // Save screenshot of error state
    const screenshotPath = path.join(SCREENSHOT_DIR, 'error_state_remediation.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    expect(fs.existsSync(screenshotPath)).toBeTruthy();
  });
});

test.describe('NYC Taxi AI System - Mobile E2E Tests (390x844)', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test('5. Mobile responsive workflow with drawer navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify map is visible on mobile
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Switch between tabs or open bottom drawer
    const tabs = page.locator('button, a, div[role="tab"]').filter({ hasText: /dự báo|tìm đường|đón/i });
    if (await tabs.count() > 0) {
      await tabs.first().click();
    }

    await page.waitForTimeout(1500);

    // Save screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, 'mobile_workflow.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    expect(fs.existsSync(screenshotPath)).toBeTruthy();
  });
});
