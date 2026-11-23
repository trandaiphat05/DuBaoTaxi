import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUDIT_DIR = path.resolve(__dirname, '../../outputs/screenshots/audit_20261121');

if (!fs.existsSync(AUDIT_DIR)) {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
}

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://127.0.0.1:8000';

const results = {
  environment: {},
  controls: [],
  journeyA: {},
  journeyB: {},
  journeyC: {},
  usability: {},
  logs: {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    apiCalls: []
  }
};

async function waitMapTiles(page) {
  try {
    await page.waitForSelector('.leaflet-tile-loaded', { timeout: 8000 });
  } catch (e) {}
  await page.waitForTimeout(800);
}

async function runAudit() {
  console.log(`Starting comprehensive audit against ${BASE_URL}...`);
  
  // Launch browser with Edge channel if available, fallback to chromium
  let browser;
  let browserName = 'Chromium (Playwright)';
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    browserName = 'Microsoft Edge (via Playwright)';
  } catch (e) {
    browser = await chromium.launch({ headless: true });
  }
  
  results.environment.browser = browserName;
  results.environment.timestamp = new Date().toISOString();
  results.environment.baseUrl = BASE_URL;
  results.environment.apiUrl = API_URL;
  console.log(`Using Browser: ${browserName}`);

  // Context for Desktop (1400x900)
  const desktopContext = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 1
  });
  const page = await desktopContext.newPage();

  // Listen for console logs, errors, and network
  page.on('console', msg => {
    if (msg.type() === 'error') {
      results.logs.consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    results.logs.pageErrors.push(err.message);
  });
  page.on('requestfailed', req => {
    results.logs.failedRequests.push({ url: req.url(), method: req.method(), failure: req.failure()?.errorText });
  });
  page.on('response', async res => {
    if (res.url().includes('/api/')) {
      try {
        const body = await res.json().catch(() => null);
        results.logs.apiCalls.push({
          url: res.url(),
          status: res.status(),
          method: res.request().method(),
          payload: res.request().postDataJSON() || null,
          response: body
        });
      } catch (e) {}
    }
  });

  // 1. Initial Load & Controls Inventory
  console.log('1. Loading home page...');
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  await waitMapTiles(page);
  await page.screenshot({ path: path.join(AUDIT_DIR, '01_desktop_home_initial.png') });

  // 2. Journey A: Prediction Testing
  console.log('2. Running Journey A: Prediction...');
  // Check default values
  const predPickupText = await page.locator('text=/Tọa độ:/').first().innerText().catch(() => '');
  console.log('Initial pickup display:', predPickupText);

  // Set Times Square -> Grand Central
  const selects = page.locator('select');
  await selects.nth(0).selectOption('times_square');
  await page.waitForTimeout(200);
  await selects.nth(1).selectOption('grand_central');
  await page.waitForTimeout(200);

  // Set Datetime and passenger count
  const dateInput = page.locator('input[type="datetime-local"]');
  const initialDateVal = await dateInput.inputValue();
  results.journeyA.initialDateInput = initialDateVal;

  // Click Predict
  const predictBtn = page.locator('[data-testid="predict-submit-btn"]');
  await predictBtn.click();
  await page.waitForTimeout(1500);
  await page.waitForSelector('text=/thời gian dự kiến/i', { timeout: 8000 });
  await page.screenshot({ path: path.join(AUDIT_DIR, '02_desktop_prediction_success.png') });

  // Read prediction UI output
  const predDurationText = await page.locator('text=/phút/i').first().innerText().catch(() => '');
  const predDistanceText = await page.locator('text=/km/i').first().innerText().catch(() => '');
  results.journeyA.normalTrip = {
    durationUI: predDurationText,
    distanceUI: predDistanceText,
  };

  // Change dropoff to Wall Street and recalculate
  await selects.nth(1).selectOption('wall_street');
  await page.waitForTimeout(200);
  await predictBtn.click();
  await page.waitForTimeout(1500);
  const predDurationText2 = await page.locator('text=/phút/i').first().innerText().catch(() => '');
  results.journeyA.updatedTrip = {
    durationUI: predDurationText2
  };

  // Test Error Case: Identical Points
  await selects.nth(0).selectOption('times_square');
  await page.waitForTimeout(200);
  await selects.nth(1).selectOption('times_square');
  await page.waitForTimeout(200);
  await predictBtn.click();
  await page.waitForTimeout(800);
  const errIdentical = await page.locator('text=/trùng nhau/i').first().innerText().catch(() => '');
  results.journeyA.identicalPointsError = errIdentical;
  await page.screenshot({ path: path.join(AUDIT_DIR, '03_desktop_prediction_error_identical.png') });

  // 3. Journey B: Routing A* Testing
  console.log('3. Running Journey B: Routing A*...');
  const routeTab = page.locator('header button').filter({ hasText: /tìm đường/i }).first();
  await routeTab.click();
  await page.waitForTimeout(500);
  await waitMapTiles(page);

  // Select Times Square -> Wall Street
  const routeSelects = page.locator('select');
  await routeSelects.nth(0).selectOption('times_square');
  await page.waitForTimeout(200);
  await routeSelects.nth(1).selectOption('wall_street');
  await page.waitForTimeout(200);

  const routeBtn = page.locator('[data-testid="route-submit-btn"]');
  await routeBtn.click();
  await page.waitForTimeout(2000);
  await page.waitForSelector('text=/tuyến ngắn nhất theo quãng đường/i', { timeout: 8000 });
  await page.screenshot({ path: path.join(AUDIT_DIR, '05_desktop_routing_success.png') });

  const routeDistUI = await page.locator('text=/km \\(/i').first().innerText().catch(() => '');
  const routeTimeUI = await page.locator('text=/phút/i').first().innerText().catch(() => '');
  const routeNodesUI = await page.locator('text=/nút/i').first().innerText().catch(() => '');
  results.journeyB.forwardRoute = {
    distUI: routeDistUI,
    timeUI: routeTimeUI,
    nodesUI: routeNodesUI
  };

  // Reversed Route: Wall Street -> Times Square
  await routeSelects.nth(0).selectOption('wall_street');
  await page.waitForTimeout(200);
  await routeSelects.nth(1).selectOption('times_square');
  await page.waitForTimeout(200);
  await routeBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(AUDIT_DIR, '06_desktop_routing_reversed.png') });
  const revDistUI = await page.locator('text=/km \\(/i').first().innerText().catch(() => '');
  results.journeyB.reversedRoute = {
    distUI: revDistUI
  };

  // Check state desync: change dropoff to Central Park WITHOUT clicking "Tìm Tuyến"
  await routeSelects.nth(1).selectOption('central_park');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(AUDIT_DIR, '07_desktop_routing_desync_input_changed.png') });
  // Check if old route stats are still on screen
  const isOldResultStillVisible = await page.locator('text=/tuyến ngắn nhất theo quãng đường/i').isVisible();
  results.journeyB.isOldResultStillVisible = isOldResultStillVisible;

  // 4. Journey C: Dispatch Testing
  console.log('4. Running Journey C: Dispatch...');
  const dispatchTab = page.locator('header button').filter({ hasText: /đón nhiều khách/i }).first();
  await dispatchTab.click();
  await page.waitForTimeout(500);
  await waitMapTiles(page);

  // Check if add/remove buttons exist
  const addBtnExists = await page.locator('button:has-text("Thêm"), button:has-text("Xóa")').count();
  results.journeyC.hasAddRemoveButtons = addBtnExists > 0;

  // Run dispatch with capacity = 4
  const dispatchBtn = page.locator('[data-testid="dispatch-submit-btn"]');
  await dispatchBtn.click();
  await page.waitForTimeout(2500);
  await page.waitForSelector('text=/lịch trình chi tiết/i', { timeout: 8000 });
  await page.screenshot({ path: path.join(AUDIT_DIR, '08_desktop_dispatch_success.png') });

  const dispatchSavedUI = await page.locator('text=/tiết kiệm/i').first().innerText().catch(() => '');
  results.journeyC.savedPercentUI = dispatchSavedUI;

  // Test capacity input: try typing 1
  const capInput = page.locator('input[type="number"]');
  await capInput.fill('1');
  const clampedCap = await capInput.inputValue();
  results.journeyC.clampedCapacity = clampedCap;

  // 5. Network Offline Simulation
  console.log('5. Simulating network offline...');
  await page.route('**/api/**', route => route.abort('failed'));
  await dispatchBtn.click();
  await page.waitForTimeout(1000);
  const offlineError = await page.locator('text=/lỗi|thông báo/i').first().innerText().catch(() => '');
  results.usability.offlineError = offlineError;
  await page.screenshot({ path: path.join(AUDIT_DIR, '09_desktop_network_offline_simulation.png') });
  await page.unroute('**/api/**');

  // Close desktop context
  await desktopContext.close();

  // 6. Mobile Testing (390x844)
  console.log('6. Running Mobile Audit (390x844)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const mPage = await mobileContext.newPage();
  await mPage.goto(BASE_URL);
  await mPage.waitForLoadState('networkidle');
  await waitMapTiles(mPage);
  await mPage.screenshot({ path: path.join(AUDIT_DIR, '10_mobile_home_view.png') });

  // Test drawer expand / collapse
  const drawerToggle = mPage.locator('text=/xem thêm|thu gọn/i').first();
  if (await drawerToggle.isVisible()) {
    await drawerToggle.click();
    await mPage.waitForTimeout(400);
  }

  // Predict on mobile
  const mSelects = mPage.locator('select');
  if (await mSelects.count() >= 2) {
    await mSelects.nth(0).selectOption('times_square');
    await mSelects.nth(1).selectOption('grand_central');
  }
  const mPredBtn = mPage.locator('[data-testid="predict-submit-btn"]');
  await mPredBtn.click();
  await mPage.waitForTimeout(2000);
  
  // Scroll result into view
  const mResCard = mPage.locator('text=/kết quả dự báo|thời gian dự kiến/i').first();
  if (await mResCard.isVisible()) {
    await mResCard.scrollIntoViewIfNeeded();
  }
  await mPage.screenshot({ path: path.join(AUDIT_DIR, '11_mobile_prediction_result.png') });

  // Route on mobile
  const mRouteTab = mPage.locator('header button').filter({ hasText: /tìm đường/i }).first();
  await mRouteTab.click();
  await mPage.waitForTimeout(500);
  const mRouteSelects = mPage.locator('select');
  if (await mRouteSelects.count() >= 2) {
    await mRouteSelects.nth(0).selectOption('times_square');
    await mRouteSelects.nth(1).selectOption('wall_street');
  }
  const mRouteBtn = mPage.locator('[data-testid="route-submit-btn"]');
  await mRouteBtn.click();
  await mPage.waitForTimeout(2000);
  const mRouteRes = mPage.locator('text=/kết quả định tuyến|tuyến ngắn nhất/i').first();
  if (await mRouteRes.isVisible()) {
    await mRouteRes.scrollIntoViewIfNeeded();
  }
  await mPage.screenshot({ path: path.join(AUDIT_DIR, '12_mobile_routing_result.png') });

  // Dispatch on mobile
  const mDispatchTab = mPage.locator('header button').filter({ hasText: /đón nhiều khách/i }).first();
  await mDispatchTab.click();
  await mPage.waitForTimeout(500);
  const mDispatchBtn = mPage.locator('[data-testid="dispatch-submit-btn"]');
  await mDispatchBtn.click();
  await mPage.waitForTimeout(2500);
  const mDispatchRes = mPage.locator('text=/hiệu quả so với đi tuần tự/i').first();
  if (await mDispatchRes.isVisible()) {
    await mDispatchRes.scrollIntoViewIfNeeded();
  }
  await mPage.screenshot({ path: path.join(AUDIT_DIR, '13_mobile_dispatch_result.png') });

  await mobileContext.close();
  await browser.close();

  // Save audit results json
  fs.writeFileSync(path.join(AUDIT_DIR, 'audit_summary.json'), JSON.stringify(results, null, 2), 'utf-8');
  console.log('Comprehensive audit complete! Results saved.');
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
