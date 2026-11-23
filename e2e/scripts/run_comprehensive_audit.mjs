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

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const BACKEND_URL = 'http://127.0.0.1:8000';

const auditLog = {
  timestamp: new Date().toISOString(),
  browser: null,
  browserVersion: null,
  backendStatus: null,
  journeyA: {},
  journeyB: {},
  journeyC: {},
  uxEvaluation: {},
  screenshots: [],
};

async function waitMapTiles(page) {
  try {
    await page.waitForSelector('.leaflet-tile-loaded', { timeout: 8000 });
  } catch (e) {
    console.log('Map tiles wait timeout, continuing...');
  }
  await page.waitForTimeout(1000);
}

async function runAudit() {
  console.log('=====================================================');
  console.log('STARTING COMPREHENSIVE UI & FUNCTIONAL AUDIT (2026-11-21)');
  console.log('=====================================================');

  // Check Backend Status
  try {
    const healthRes = await fetch(`${BACKEND_URL}/api/health`);
    const healthData = await healthRes.json();
    const readyRes = await fetch(`${BACKEND_URL}/api/ready`);
    const readyData = await readyRes.json();
    auditLog.backendStatus = { health: healthData, ready: readyData };
    console.log('[BACKEND]', JSON.stringify(auditLog.backendStatus));
  } catch (err) {
    console.error('[BACKEND ERROR]', err.message);
  }

  // Launch Browser: Try msedge first, fallback to chromium
  let browser;
  let browserTypeUsed = 'msedge';
  try {
    console.log('Attempting launch with Microsoft Edge (channel: msedge)...');
    browser = await chromium.launch({
      channel: 'msedge',
      headless: true,
    });
    auditLog.browser = 'Microsoft Edge';
    auditLog.browserVersion = browser.version();
    console.log(`[BROWSER] Launched Microsoft Edge ${auditLog.browserVersion}`);
  } catch (edgeErr) {
    console.warn('Edge launch failed, falling back to Chromium:', edgeErr.message);
    browser = await chromium.launch({ headless: true });
    browserTypeUsed = 'chromium';
    auditLog.browser = 'Chromium (Playwright)';
    auditLog.browserVersion = browser.version();
    console.log(`[BROWSER] Launched Chromium ${auditLog.browserVersion}`);
  }

  // =========================================================
  // 1. DESKTOP AUDIT (1400x900)
  // =========================================================
  console.log('\n--- 1. DESKTOP WORKSPACE (1400x900) ---');
  const desktopContext = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await desktopContext.newPage();

  // Network Interception for API analysis
  let lastPredictRequest = null;
  let lastPredictResponse = null;
  let lastRouteRequest = null;
  let lastRouteResponse = null;
  let lastDispatchRequest = null;
  let lastDispatchResponse = null;

  page.on('request', (req) => {
    if (req.url().includes('/api/predict')) {
      try { lastPredictRequest = JSON.parse(req.postData() || '{}'); } catch(e){}
    } else if (req.url().includes('/api/route')) {
      try { lastRouteRequest = JSON.parse(req.postData() || '{}'); } catch(e){}
    } else if (req.url().includes('/api/dispatch')) {
      try { lastDispatchRequest = JSON.parse(req.postData() || '{}'); } catch(e){}
    }
  });

  page.on('response', async (res) => {
    if (res.url().includes('/api/predict')) {
      try { lastPredictResponse = await res.json(); } catch(e){}
    } else if (res.url().includes('/api/route')) {
      try { lastRouteResponse = await res.json(); } catch(e){}
    } else if (res.url().includes('/api/dispatch')) {
      try { lastDispatchResponse = await res.json(); } catch(e){}
    }
  });

  // Navigate to app
  console.log(`Navigating to ${BASE_URL}...`);
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  await waitMapTiles(page);

  // Initial State Screenshot
  const ssInitial = path.join(AUDIT_DIR, '01_desktop_initial_state.png');
  await page.screenshot({ path: ssInitial, fullPage: false });
  auditLog.screenshots.push({ name: '01_desktop_initial_state.png', desc: 'Giao diện khởi đầu desktop 1400x900' });
  console.log(`[SAVED] ${ssInitial}`);

  // ---------------------------------------------------------
  // HÀNH TRÌNH A: DỰ BÁO CHUYẾN ĐI (Prediction)
  // ---------------------------------------------------------
  console.log('\n=== HÀNH TRÌNH A: DỰ BÁO CHUYẾN ĐI ===');

  // Select Tab Prediction
  const tabPred = page.locator('button').filter({ hasText: /dự báo/i }).first();
  await tabPred.click();
  await page.waitForTimeout(400);

  // A1. Standard Journey: Times Square to Grand Central
  console.log('A1. Chạy dự báo chuẩn: Times Square -> Grand Central');
  const selects = page.locator('select');
  // Pickup: Times Square (value: times_square or index 1)
  await selects.nth(0).selectOption({ label: 'Times Square (Quảng trường Thời Đại)' });
  await page.waitForTimeout(300);
  // Dropoff: Grand Central
  await selects.nth(1).selectOption({ label: 'Grand Central (Nhà ga Trung tâm Grand Central)' });
  await page.waitForTimeout(300);

  // Set datetime-local input
  const dateInput = page.locator('input[type="datetime-local"]');
  await dateInput.fill('2026-11-21T09:30');
  await page.waitForTimeout(200);

  // Set passenger count = 2
  const paxInput = page.locator('input[type="number"]').first();
  await paxInput.fill('2');
  await page.waitForTimeout(200);

  // Click Predict
  const btnPredict = page.locator('button').filter({ hasText: /dự báo thời gian/i }).first();
  await btnPredict.click();
  await page.waitForTimeout(1500);

  // Save Screenshot A1
  const ssA1 = path.join(AUDIT_DIR, '02_journeyA_prediction_success.png');
  await page.screenshot({ path: ssA1, fullPage: false });
  auditLog.screenshots.push({ name: '02_journeyA_prediction_success.png', desc: 'Kết quả dự báo chuẩn' });
  console.log(`[SAVED] ${ssA1}`);

  auditLog.journeyA.standard = {
    requestPayload: lastPredictRequest,
    responsePayload: lastPredictResponse,
  };
  console.log('A1 Payload:', lastPredictRequest);
  console.log('A1 Response:', lastPredictResponse);

  // A2. Change location & time
  console.log('A2. Đổi điểm & giờ: Times Square -> Wall Street vào 18:00');
  await selects.nth(1).selectOption({ label: 'Wall Street (Phố Wall (Khu Tài Chính))' });
  await dateInput.fill('2026-11-21T18:00');
  await btnPredict.click();
  await page.waitForTimeout(1500);

  const ssA2 = path.join(AUDIT_DIR, '03_journeyA_prediction_updated.png');
  await page.screenshot({ path: ssA2, fullPage: false });
  auditLog.screenshots.push({ name: '03_journeyA_prediction_updated.png', desc: 'Dự báo sau khi đổi điểm & giờ' });
  console.log(`[SAVED] ${ssA2}`);

  auditLog.journeyA.updated = {
    requestPayload: lastPredictRequest,
    responsePayload: lastPredictResponse,
  };

  // A3. Negative Tests: Passenger Count limits (0, 7)
  console.log('A3. Thử nghiệm số khách ngoài giới hạn: 0 và 7');
  await paxInput.fill('0');
  // Client clamp check: does it clamp to 1?
  const valPax0 = await paxInput.inputValue();
  await paxInput.fill('7');
  const valPax7 = await paxInput.inputValue();
  auditLog.journeyA.passengerLimits = { input0Yields: valPax0, input7Yields: valPax7 };

  // A4. Negative Tests: Empty / identical / out of bounds
  console.log('A4. Thử nghiệm điểm ngoài Manhattan & trùng nhau');
  // Try sending out-of-bounds via direct fetch to test API error contract
  const oobResponse = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_lat: 41.5000,
          pickup_lon: -73.9855,
          dropoff_lat: 40.7069,
          dropoff_lon: -74.0090,
          pickup_datetime: '2026-11-21T09:30:00',
          passenger_count: 1,
        }),
      });
      return { status: res.status, body: await res.json() };
    } catch (e) {
      return { error: e.message };
    }
  });

  const dupResponse = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_lat: 40.7580,
          pickup_lon: -73.9855,
          dropoff_lat: 40.7580,
          dropoff_lon: -73.9855,
          pickup_datetime: '2026-11-21T09:30:00',
          passenger_count: 1,
        }),
      });
      return { status: res.status, body: await res.json() };
    } catch (e) {
      return { error: e.message };
    }
  });

  auditLog.journeyA.negativeTests = {
    outOfBounds: oobResponse,
    identicalCoordinates: dupResponse,
  };
  console.log('A4 OOB:', oobResponse);
  console.log('A4 Duplicate:', dupResponse);

  // Trigger error on UI
  await page.evaluate(() => {
    // Select placeholder to reset
    const s = document.querySelectorAll('select');
    if (s.length >= 2) {
      s[1].selectedIndex = 0;
      s[1].dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  // Clear dropoff state or trigger UI validate
  await btnPredict.click();
  await page.waitForTimeout(500);

  const ssA4 = path.join(AUDIT_DIR, '04_journeyA_error_remediation.png');
  await page.screenshot({ path: ssA4, fullPage: false });
  auditLog.screenshots.push({ name: '04_journeyA_error_remediation.png', desc: 'Chỉ dẫn khắc phục lỗi dự báo' });
  console.log(`[SAVED] ${ssA4}`);

  // ---------------------------------------------------------
  // HÀNH TRÌNH B: TÌM ĐƯỜNG A* (Shortest Path Routing)
  // ---------------------------------------------------------
  console.log('\n=== HÀNH TRÌNH B: TÌM ĐƯỜNG A* ===');

  const tabRoute = page.locator('button').filter({ hasText: /tìm đường/i }).first();
  await tabRoute.click();
  await page.waitForTimeout(400);

  // B1. Forward Route: Times Square -> Wall Street
  console.log('B1. Tìm tuyến thuận: Times Square -> Wall Street');
  const routeSelects = page.locator('select');
  await routeSelects.nth(0).selectOption({ label: 'Times Square (Quảng trường Thời Đại)' });
  await page.waitForTimeout(200);
  await routeSelects.nth(1).selectOption({ label: 'Wall Street (Phố Wall (Khu Tài Chính))' });
  await page.waitForTimeout(200);

  const btnFindRoute = page.locator('button').filter({ hasText: /Tìm Tuyến Ngắn Nhất/i }).first();
  await btnFindRoute.click();
  await page.waitForTimeout(2000);
  await waitMapTiles(page);

  const ssB1 = path.join(AUDIT_DIR, '05_journeyB_routing_forward.png');
  await page.screenshot({ path: ssB1, fullPage: false });
  auditLog.screenshots.push({ name: '05_journeyB_routing_forward.png', desc: 'Tuyến thuận A* Times Square -> Wall Street' });
  console.log(`[SAVED] ${ssB1}`);

  auditLog.journeyB.forward = {
    request: lastRouteRequest,
    response: lastRouteResponse,
  };
  console.log('B1 Route Response:', {
    distance_meters: lastRouteResponse?.distance_meters,
    duration_seconds: lastRouteResponse?.duration_seconds,
    visited_nodes: lastRouteResponse?.visited_nodes,
    coords_count: lastRouteResponse?.geojson?.coordinates?.length,
  });

  // B2. Reverse Route: Wall Street -> Times Square (One-way check)
  console.log('B2. Đảo chiều tuyến: Wall Street -> Times Square');
  await routeSelects.nth(0).selectOption({ label: 'Wall Street (Phố Wall (Khu Tài Chính))' });
  await page.waitForTimeout(200);
  await routeSelects.nth(1).selectOption({ label: 'Times Square (Quảng trường Thời Đại)' });
  await page.waitForTimeout(200);

  await btnFindRoute.click();
  await page.waitForTimeout(2000);
  await waitMapTiles(page);

  const ssB2 = path.join(AUDIT_DIR, '06_journeyB_routing_reverse.png');
  await page.screenshot({ path: ssB2, fullPage: false });
  auditLog.screenshots.push({ name: '06_journeyB_routing_reverse.png', desc: 'Tuyến nghịch A* Wall Street -> Times Square' });
  console.log(`[SAVED] ${ssB2}`);

  auditLog.journeyB.reverse = {
    request: lastRouteRequest,
    response: lastRouteResponse,
  };
  console.log('B2 Reverse Route Response:', {
    distance_meters: lastRouteResponse?.distance_meters,
    duration_seconds: lastRouteResponse?.duration_seconds,
  });

  // B3. Stress Test: Double click & Fast Tab Switch
  console.log('B3. Bấm nhanh 2 lần & chuyển tab khi đang tìm đường');
  await routeSelects.nth(0).selectOption({ label: 'Central Park (Công viên Trung tâm (Cổng Nam))' });
  await routeSelects.nth(1).selectOption({ label: 'Empire State (Tòa nhà Empire State)' });
  await btnFindRoute.click();
  await btnFindRoute.click(); // rapid double click
  await tabPred.click(); // switch tab immediately
  await page.waitForTimeout(300);
  await tabRoute.click(); // switch back
  await page.waitForTimeout(1500);

  const ssB3 = path.join(AUDIT_DIR, '07_journeyB_stress_tab_switch.png');
  await page.screenshot({ path: ssB3, fullPage: false });
  auditLog.screenshots.push({ name: '07_journeyB_stress_tab_switch.png', desc: 'Trạng thái sau stress test double-click và tab switch' });
  console.log(`[SAVED] ${ssB3}`);

  // B4. Algorithmic Comparison: A* vs Dijkstra on Backend
  const compResult = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_lat: 40.7580,
          pickup_lon: -73.9855,
          dropoff_lat: 40.7069,
          dropoff_lon: -74.0090,
        }),
      });
      return await res.json();
    } catch (e) {
      return { error: e.message };
    }
  });
  auditLog.journeyB.comparison = compResult;

  // ---------------------------------------------------------
  // HÀNH TRÌNH C: ĐÓN NHIỀU KHÁCH (Multi-Passenger Pooling)
  // ---------------------------------------------------------
  console.log('\n=== HÀNH TRÌNH C: ĐÓN NHIỀU KHÁCH ===');

  const tabDispatch = page.locator('button').filter({ hasText: /đón nhiều khách/i }).first();
  await tabDispatch.click();
  await page.waitForTimeout(400);

  // C1. Run 3 requests with Capacity C=4
  console.log('C1. Chạy giải thuật điều phối 3 khách với sức chứa C=4');
  const btnRunDispatch = page.locator('button').filter({ hasText: /tối ưu hóa|lập lịch/i }).first();
  await btnRunDispatch.click();
  await page.waitForTimeout(2000);
  await waitMapTiles(page);

  const ssC1 = path.join(AUDIT_DIR, '08_journeyC_dispatch_schedule.png');
  await page.screenshot({ path: ssC1, fullPage: false });
  auditLog.screenshots.push({ name: '08_journeyC_dispatch_schedule.png', desc: 'Lịch trình điều phối 3 khách tối ưu' });
  console.log(`[SAVED] ${ssC1}`);

  auditLog.journeyC.result = lastDispatchResponse;
  console.log('C1 Dispatch Stops Count:', lastDispatchResponse?.stops?.length);
  console.log('C1 Dispatch Time Saved:', lastDispatchResponse?.time_saved_seconds, 's (', lastDispatchResponse?.time_saved_percent, '%)');

  // C2. Inspect UI controls: Is there Add/Remove button for passengers?
  const addBtnCount = await page.locator('button').filter({ hasText: /thêm khách|thêm yêu cầu|\+/i }).count();
  const removeBtnCount = await page.locator('button').filter({ hasText: /xóa khách|hủy|loại bỏ/i }).count();
  auditLog.journeyC.uiControls = {
    hasAddPassengerButton: addBtnCount > 0,
    hasRemovePassengerButton: removeBtnCount > 0,
  };
  console.log('C2 UI Add/Remove Buttons:', auditLog.journeyC.uiControls);

  // C3. Capacity Tests: Single request pax > C vs Total pax > C
  console.log('C3. Thử nghiệm sức chứa: pax đơn > C vs tổng pax > C');
  const capExceedSingle = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_lat: 40.7580,
          start_lon: -73.9855,
          capacity: 4,
          requests: [
            {
              id: 1,
              name: 'Khách VIP',
              pickup_lat: 40.7580,
              pickup_lon: -73.9855,
              dropoff_lat: 40.7069,
              dropoff_lon: -74.0090,
              passengers: 5, // Exceeds C=4!
            },
          ],
        }),
      });
      return { status: res.status, body: await res.json() };
    } catch (e) {
      return { error: e.message };
    }
  });

  const capTotalExceedSequential = await page.evaluate(async () => {
    try {
      // Total pax = 2 + 2 + 2 = 6 > C=4, but each leg max load can be <= 4 if served sequentially
      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_lat: 40.7580,
          start_lon: -73.9855,
          capacity: 4,
          requests: [
            {
              id: 1,
              name: 'Khách 1',
              pickup_lat: 40.7580,
              pickup_lon: -73.9855,
              dropoff_lat: 40.7484,
              dropoff_lon: -73.9857,
              passengers: 2,
            },
            {
              id: 2,
              name: 'Khách 2',
              pickup_lat: 40.7527,
              pickup_lon: -73.9772,
              dropoff_lat: 40.7233,
              dropoff_lon: -74.0030,
              passengers: 2,
            },
            {
              id: 3,
              name: 'Khách 3',
              pickup_lat: 40.7484,
              pickup_lon: -73.9857,
              dropoff_lat: 40.7069,
              dropoff_lon: -74.0090,
              passengers: 2,
            },
          ],
        }),
      });
      return { status: res.status, body: await res.json() };
    } catch (e) {
      return { error: e.message };
    }
  });

  auditLog.journeyC.capacityEvaluation = {
    singleRequestExceedsCapacity: capExceedSingle,
    totalExceedsCapacityServedSequentially: {
      status: capTotalExceedSequential.status,
      success: capTotalExceedSequential.status === 200,
      stops: capTotalExceedSequential.body?.stops?.length,
      maxLoadObserved: Math.max(...(capTotalExceedSequential.body?.vehicle_load || [0])),
    },
  };
  console.log('C3 Pax > C Single:', capExceedSingle);
  console.log('C3 Total Pax > C Served Sequentially:', auditLog.journeyC.capacityEvaluation.totalExceedsCapacityServedSequentially);

  // ---------------------------------------------------------
  // 4. NETWORK DISCONNECTION SIMULATION
  // ---------------------------------------------------------
  console.log('\n=== KIỂM THỬ GIẢ LẬP NGẮT KẾT NỐI MẠNG /API/* ===');
  await page.route('**/api/**', (route) => route.abort());

  await tabPred.click();
  await page.waitForTimeout(300);
  await btnPredict.click();
  await page.waitForTimeout(1000);

  const ssOffline = path.join(AUDIT_DIR, '09_network_disconnection_simulation.png');
  await page.screenshot({ path: ssOffline, fullPage: false });
  auditLog.screenshots.push({ name: '09_network_disconnection_simulation.png', desc: 'Trạng thái khi mất kết nối mạng API' });
  console.log(`[SAVED] ${ssOffline}`);

  // Restore network route
  await page.unroute('**/api/**');

  await desktopContext.close();

  // =========================================================
  // 2. MOBILE AUDIT (390x844 - iPhone 12/13/14)
  // =========================================================
  console.log('\n--- 2. MOBILE WORKSPACE (390x844) ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mPage = await mobileContext.newPage();

  await mPage.goto(BASE_URL);
  await mPage.waitForLoadState('networkidle');
  await waitMapTiles(mPage);

  // M1. Mobile Initial Drawer
  const ssM1 = path.join(AUDIT_DIR, '10_mobile_initial_drawer.png');
  await mPage.screenshot({ path: ssM1, fullPage: false });
  auditLog.screenshots.push({ name: '10_mobile_initial_drawer.png', desc: 'Giao diện mobile ban đầu với bottom drawer' });
  console.log(`[SAVED] ${ssM1}`);

  // M2. Expand Mobile Drawer
  const drawerToggle = mPage.locator('button').filter({ hasText: /xem thêm|thu gọn/i }).first();
  if (await drawerToggle.isVisible()) {
    await drawerToggle.click();
    await mPage.waitForTimeout(400);
  }

  const ssM2 = path.join(AUDIT_DIR, '11_mobile_drawer_expanded.png');
  await mPage.screenshot({ path: ssM2, fullPage: false });
  auditLog.screenshots.push({ name: '11_mobile_drawer_expanded.png', desc: 'Giao diện mobile sau khi bung rộng drawer' });
  console.log(`[SAVED] ${ssM2}`);

  // M3. Mobile Tab Switching to Routing
  const mTabRoute = mPage.locator('button').filter({ hasText: /tìm đường/i }).first();
  await mTabRoute.click();
  await mPage.waitForTimeout(400);

  const mRouteBtn = mPage.locator('button').filter({ hasText: /Tìm Tuyến Ngắn Nhất/i }).first();
  if (await mRouteBtn.isVisible()) {
    await mRouteBtn.click();
    await mPage.waitForTimeout(1500);
  }

  const ssM3 = path.join(AUDIT_DIR, '12_mobile_routing_workflow.png');
  await mPage.screenshot({ path: ssM3, fullPage: false });
  auditLog.screenshots.push({ name: '12_mobile_routing_workflow.png', desc: 'Quy trình tìm đường trên di động' });
  console.log(`[SAVED] ${ssM3}`);

  await mobileContext.close();
  await browser.close();

  // Save audit data log
  const logPath = path.join(AUDIT_DIR, 'audit_data.json');
  fs.writeFileSync(logPath, JSON.stringify(auditLog, null, 2), 'utf-8');
  console.log(`\n[COMPLETE] Audit log written to ${logPath}`);
}

runAudit().catch((err) => {
  console.error('Fatal error during audit:', err);
  process.exit(1);
});
