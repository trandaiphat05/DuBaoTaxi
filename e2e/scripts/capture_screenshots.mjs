import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOTS_DIR = path.resolve(__dirname, '../../outputs/screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

async function waitMapTiles(page) {
  try {
    await page.waitForSelector('.leaflet-tile-loaded', { timeout: 8000 });
  } catch (e) {
    console.log('Map tiles wait timeout, continuing...');
  }
  await page.waitForTimeout(1000);
}

async function captureDesktopScreenshots() {
  console.log(`Starting Desktop Screenshot Captures at 1400x900 against ${BASE_URL}...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // 1. Desktop Prediction
  console.log('Capturing: desktop_prediction.png');
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  await waitMapTiles(page);

  // Switch to Prediction Tab
  const predTab = page.locator('header button').filter({ hasText: /dự báo/i }).first();
  if (await predTab.isVisible()) {
    await predTab.click();
    await page.waitForTimeout(400);
  }

  // Select Presets for Pickup and Dropoff
  const selects = page.locator('select');
  if ((await selects.count()) >= 2) {
    await selects.nth(0).selectOption('times_square');
    await page.waitForTimeout(300);
    await selects.nth(1).selectOption('grand_central');
    await page.waitForTimeout(300);
  }

  // Click Predict submit button
  const predictBtn = page.locator('[data-testid="predict-submit-btn"]');
  if (await predictBtn.isVisible()) {
    await predictBtn.click();
    await page.waitForTimeout(2000);
  }

  // Wait for result card
  try {
    await page.waitForSelector('text=/thời gian dự kiến|phút/i', { timeout: 8000 });
  } catch (e) {
    console.log('Wait prediction result timed out:', e.message);
  }
  await page.waitForTimeout(1000);
  await waitMapTiles(page);

  const predPath = path.join(SCREENSHOTS_DIR, 'desktop_prediction.png');
  await page.screenshot({ path: predPath, fullPage: false });
  console.log(`Saved: ${predPath}`);

  // 2. Desktop Routing A*
  console.log('Capturing: desktop_routing_astar.png');
  const routeTab = page.locator('header button').filter({ hasText: /tìm đường/i }).first();
  if (await routeTab.isVisible()) {
    await routeTab.click();
    await page.waitForTimeout(600);
  }

  const routeSelects = page.locator('select');
  if ((await routeSelects.count()) >= 2) {
    await routeSelects.nth(0).selectOption('times_square');
    await page.waitForTimeout(300);
    await routeSelects.nth(1).selectOption('wall_street');
    await page.waitForTimeout(300);
  }

  const findRouteBtn = page.locator('[data-testid="route-submit-btn"]');
  if (await findRouteBtn.isVisible()) {
    await findRouteBtn.click();
    await page.waitForTimeout(2500);
  }

  try {
    await page.waitForSelector('text=/ngắn nhất theo quãng đường|khoảng cách|mét|km/i', { timeout: 8000 });
  } catch (e) {
    console.log('Wait route result timed out:', e.message);
  }
  await waitMapTiles(page);

  const routePath = path.join(SCREENSHOTS_DIR, 'desktop_routing_astar.png');
  await page.screenshot({ path: routePath, fullPage: false });
  console.log(`Saved: ${routePath}`);

  // 3. Desktop Dispatch Schedule
  console.log('Capturing: desktop_dispatch_schedule.png');
  const dispatchTab = page.locator('header button').filter({ hasText: /đón nhiều khách|điều phối/i }).first();
  if (await dispatchTab.isVisible()) {
    await dispatchTab.click();
    await page.waitForTimeout(600);
  }

  const optimizeBtn = page.locator('[data-testid="dispatch-submit-btn"]');
  if (await optimizeBtn.isVisible()) {
    await optimizeBtn.click();
    await page.waitForTimeout(2500);
  }

  try {
    await page.waitForSelector('text=/lịch trình chi tiết|thứ tự|tải trọng|tiết kiệm/i', { timeout: 8000 });
  } catch (e) {
    console.log('Wait dispatch result timed out:', e.message);
  }
  await waitMapTiles(page);

  const dispatchPath = path.join(SCREENSHOTS_DIR, 'desktop_dispatch_schedule.png');
  await page.screenshot({ path: dispatchPath, fullPage: false });
  console.log(`Saved: ${dispatchPath}`);

  // 4. Error State Remediation
  console.log('Capturing: error_state_remediation.png');
  // Return to Routing tab
  if (await routeTab.isVisible()) {
    await routeTab.click();
    await page.waitForTimeout(400);
  }

  // Set identical points to trigger validation error
  const errSelects = page.locator('select');
  if ((await errSelects.count()) >= 2) {
    await errSelects.nth(0).selectOption('times_square');
    await page.waitForTimeout(200);
    await errSelects.nth(1).selectOption('times_square');
    await page.waitForTimeout(200);
  }

  const errRouteBtn = page.locator('[data-testid="route-submit-btn"]');
  if (await errRouteBtn.isVisible()) {
    await errRouteBtn.click();
    await page.waitForTimeout(1000);
  }

  // Wait for error banner
  try {
    await page.waitForSelector('text=/thông báo|trùng nhau|chọn lại/i', { timeout: 5000 });
  } catch (e) {}
  await page.waitForTimeout(600);

  const errPath = path.join(SCREENSHOTS_DIR, 'error_state_remediation.png');
  await page.screenshot({ path: errPath, fullPage: false });
  console.log(`Saved: ${errPath}`);

  await browser.close();
}

async function captureMobileScreenshots() {
  console.log(`Starting Mobile Screenshot Capture at 390x844 against ${BASE_URL}...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  console.log('Capturing: mobile_workflow.png');
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  await waitMapTiles(page);

  // Switch to prediction on mobile
  const predTab = page.locator('header button').filter({ hasText: /dự báo/i }).first();
  if (await predTab.isVisible()) {
    await predTab.click();
    await page.waitForTimeout(400);
  }

  const selects = page.locator('select');
  if ((await selects.count()) >= 2) {
    await selects.nth(0).selectOption('times_square');
    await page.waitForTimeout(200);
    await selects.nth(1).selectOption('grand_central');
    await page.waitForTimeout(200);
  }

  const predictBtn = page.locator('[data-testid="predict-submit-btn"]');
  if (await predictBtn.isVisible()) {
    await predictBtn.click();
    await page.waitForTimeout(2000);
  }

  try {
    const resCard = page.locator('text=/kết quả dự báo|thời gian dự kiến|phút/i').first();
    await resCard.waitFor({ timeout: 6000 });
    await resCard.scrollIntoViewIfNeeded();
  } catch (e) {}

  await page.waitForTimeout(1000);
  const mobilePath = path.join(SCREENSHOTS_DIR, 'mobile_workflow.png');
  await page.screenshot({ path: mobilePath, fullPage: false });
  console.log(`Saved: ${mobilePath}`);

  await browser.close();
}

async function run() {
  try {
    await captureDesktopScreenshots();
    await captureMobileScreenshots();
    console.log('All screenshots captured successfully!');
  } catch (err) {
    console.error('Error during screenshot capture:', err);
    process.exit(1);
  }
}

run();
