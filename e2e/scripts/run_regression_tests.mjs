import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REGRESSION_DIR = path.resolve(__dirname, '../../outputs/screenshots/regression');

if (!fs.existsSync(REGRESSION_DIR)) {
  fs.mkdirSync(REGRESSION_DIR, { recursive: true });
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

async function waitMapTiles(page) {
  try {
    await page.waitForSelector('.leaflet-tile-loaded', { timeout: 8000 });
  } catch (e) {
    console.log('Map tiles wait timeout, continuing...');
  }
  await page.waitForTimeout(800);
}

const regressionReport = {
  timestamp: new Date().toISOString(),
  browser: null,
  browserVersion: null,
  testResults: [],
  screenshots: [],
};

async function runRegression() {
  console.log('========================================================');
  console.log('STARTING REGRESSION AUDIT & UPGRADE VERIFICATION');
  console.log('========================================================');

  let browser;
  try {
    console.log('Launching Microsoft Edge (channel: msedge)...');
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    regressionReport.browser = 'Microsoft Edge';
    regressionReport.browserVersion = browser.version();
  } catch (e) {
    console.log('Edge fallback to Chromium...');
    browser = await chromium.launch({ headless: true });
    regressionReport.browser = 'Chromium';
    regressionReport.browserVersion = browser.version();
  }
  console.log(`Browser: ${regressionReport.browser} ${regressionReport.browserVersion}`);

  // Test Context 1: Desktop (1400x900) emulating Asia/Ho_Chi_Minh timezone
  const desktopContext = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    timezoneId: 'Asia/Ho_Chi_Minh',
    locale: 'vi-VN',
  });
  const page = await desktopContext.newPage();

  console.log(`Navigating to ${BASE_URL}...`);
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  await waitMapTiles(page);

  // -------------------------------------------------------------
  // TEST 1: KIỂM TRA GIỜ KHỞI HÀNH & MÚI GIỜ NEW YORK
  // -------------------------------------------------------------
  console.log('\n--- 1. Kiểm tra nhãn & giờ khởi hành New York ---');
  const tabPred = page.locator('button').filter({ hasText: /dự báo/i }).first();
  await tabPred.click();
  await page.waitForTimeout(400);

  // Check label
  const labelText = await page.locator('text=/giờ khởi hành tại new york|thời gian xuất phát/i').first().innerText().catch(() => '');
  const tzNotice = await page.locator('text=/múi giờ new york|edt|est/i').first().isVisible().catch(() => false);
  console.log('Nhãn thời gian:', labelText, '| Có ghi chú múi giờ New York:', tzNotice);

  // Check datetime value vs New York time
  const dateInput = page.locator('input[type="datetime-local"]');
  const dateVal = await dateInput.inputValue();
  console.log('Giá trị mặc định của input datetime-local:', dateVal);

  const ss05 = path.join(REGRESSION_DIR, '05_new_york_timezone_input.png');
  await page.screenshot({ path: ss05, fullPage: false });
  regressionReport.screenshots.push({ name: '05_new_york_timezone_input.png', desc: 'Nhãn và giờ khởi hành New York' });

  // -------------------------------------------------------------
  // TEST 2: KIỂM TRA NGẮT MẠNG RIÊNG BIỆT TỪNG API
  // -------------------------------------------------------------
  console.log('\n--- 2. Kiểm tra ngắt mạng riêng biệt từng API ---');

  // 2A. /api/predict ngắt mạng -> hiển thị nhãn "Ước tính dự phòng · Máy chủ không phản hồi"
  console.log('2A. Ngắt mạng /api/predict...');
  await page.route('**/api/predict', (route) => route.abort());

  const btnPredict = page.locator('button').filter({ hasText: /dự báo thời gian/i }).first();
  await btnPredict.click();
  await page.waitForTimeout(1200);

  const fallbackBadge = await page.locator('text=/ước tính dự phòng|máy chủ không phản hồi/i').first().isVisible().catch(() => false);
  console.log('Có hiển thị nhãn Ước tính dự phòng:', fallbackBadge);

  const ss01 = path.join(REGRESSION_DIR, '01_predict_offline_fallback.png');
  await page.screenshot({ path: ss01, fullPage: false });
  regressionReport.screenshots.push({ name: '01_predict_offline_fallback.png', desc: 'Dự báo dự phòng khi mất kết nối API' });

  // Unroute predict
  await page.unroute('**/api/predict');

  // 2B. /api/route ngắt mạng -> Lỗi cụ thể + nút "Thử lại", KHÔNG hiển thị dữ liệu giả
  console.log('2B. Ngắt mạng /api/route...');
  const tabRoute = page.locator('button').filter({ hasText: /tìm đường/i }).first();
  await tabRoute.click();
  await page.waitForTimeout(400);

  // Abort /api/route
  await page.route('**/api/route', (route) => route.abort());

  const btnFindRoute = page.locator('button').filter({ hasText: /Tìm Tuyến Ngắn Nhất/i }).first();
  await btnFindRoute.click();
  await page.waitForTimeout(1000);

  const retryRouteBtn = page.locator('button').filter({ hasText: /thử lại/i }).first();
  const hasRetryRoute = await retryRouteBtn.isVisible().catch(() => false);
  const fakeRouteCard = await page.locator('text=/kết quả định tuyến a\*/i').first().isVisible().catch(() => false);
  console.log('Tìm đường có nút Thử lại:', hasRetryRoute, '| Không hiển thị thẻ kết quả giả:', !fakeRouteCard);

  const ss02 = path.join(REGRESSION_DIR, '02_routing_offline_error_retry.png');
  await page.screenshot({ path: ss02, fullPage: false });
  regressionReport.screenshots.push({ name: '02_routing_offline_error_retry.png', desc: 'Báo lỗi và nút Thử lại khi ngắt mạng tìm đường' });

  // Khôi phục mạng và bấm "Thử lại"
  console.log('Khôi phục mạng /api/route và bấm "Thử lại"...');
  await page.unroute('**/api/route');
  if (hasRetryRoute) {
    await retryRouteBtn.click();
    await page.waitForTimeout(1500);
  } else {
    await btnFindRoute.click();
    await page.waitForTimeout(1500);
  }
  await waitMapTiles(page);

  const routeSuccessCard = await page.locator('text=/kết quả định tuyến a\*/i').first().isVisible().catch(() => false);
  console.log('Sau khi bấm Thử lại, có kết quả thật từ API:', routeSuccessCard);

  const ss03 = path.join(REGRESSION_DIR, '03_routing_retry_success.png');
  await page.screenshot({ path: ss03, fullPage: false });
  regressionReport.screenshots.push({ name: '03_routing_retry_success.png', desc: 'Nhận kết quả thật sau khi bấm Thử lại' });

  // -------------------------------------------------------------
  // TEST 3: XÓA TRẠNG THÁI KHI ĐỔI ĐẦU VÀO
  // -------------------------------------------------------------
  console.log('\n--- 3. Kiểm tra tự động xóa kết quả khi đổi đầu vào ---');
  // While on Routing tab with result showing, change dropoff select
  const routeSelects = page.locator('select');
  if (await routeSelects.count() >= 2) {
    await routeSelects.nth(1).selectOption({ index: 2 }); // Change dropoff to Central Park
    await page.waitForTimeout(400);
  }
  const routeCardAfterChange = await page.locator('text=/kết quả định tuyến a\*/i').first().isVisible().catch(() => false);
  console.log('Sau khi đổi điểm đến, thẻ kết quả cũ đã bị xóa:', !routeCardAfterChange);

  const ss06 = path.join(REGRESSION_DIR, '06_routing_state_cleared_on_change.png');
  await page.screenshot({ path: ss06, fullPage: false });
  regressionReport.screenshots.push({ name: '06_routing_state_cleared_on_change.png', desc: 'Trạng thái cũ được xóa sạch khi đổi điểm' });

  // -------------------------------------------------------------
  // TEST 4: ĐIỀU PHỐI ĐÓN NHIỀU KHÁCH - THÊM / XÓA ĐỘNG
  // -------------------------------------------------------------
  console.log('\n--- 4. Kiểm tra Thêm / Xóa động yêu cầu ghép chuyến ---');
  const tabDispatch = page.locator('button').filter({ hasText: /đón nhiều khách/i }).first();
  await tabDispatch.click();
  await page.waitForTimeout(400);

  // 4A. Test offline dispatch
  console.log('4A. Kiểm tra ngắt mạng /api/dispatch...');
  await page.route('**/api/dispatch', (route) => route.abort());

  const btnDispatch = page.locator('button').filter({ hasText: /tối ưu hóa|lập lịch/i }).first();
  await btnDispatch.click();
  await page.waitForTimeout(1000);

  const retryDispatchBtn = page.locator('button').filter({ hasText: /thử lại/i }).first();
  const hasRetryDispatch = await retryDispatchBtn.isVisible().catch(() => false);
  console.log('Điều phối có nút Thử lại khi mất mạng:', hasRetryDispatch);

  const ss04 = path.join(REGRESSION_DIR, '04_dispatch_offline_error.png');
  await page.screenshot({ path: ss04, fullPage: false });
  regressionReport.screenshots.push({ name: '04_dispatch_offline_error.png', desc: 'Báo lỗi và nút Thử lại khi mất mạng điều phối' });

  await page.unroute('**/api/dispatch');
  await page.waitForTimeout(300);

  // 4B. Test Add Request (Thêm yêu cầu thứ 4)
  console.log('4B. Thử nghiệm thêm yêu cầu thứ 4...');
  const addReqBtn = page.locator('button').filter({ hasText: /thêm yêu cầu|\+ thêm/i }).first();
  const hasAddBtn = await addReqBtn.isVisible().catch(() => false);
  console.log('Có nút Thêm yêu cầu:', hasAddBtn);

  if (hasAddBtn) {
    // Click to add 4th request
    await addReqBtn.click();
    await page.waitForTimeout(400);

    // Verify button disabled or notice when reached 4
    const isAddDisabled = await addReqBtn.isDisabled().catch(() => false);
    console.log('Nút Thêm yêu cầu bị vô hiệu hóa khi đạt tối đa 4:', isAddDisabled);

    const ss07 = path.join(REGRESSION_DIR, '07_dispatch_4_requests_max.png');
    await page.screenshot({ path: ss07, fullPage: false });
    regressionReport.screenshots.push({ name: '07_dispatch_4_requests_max.png', desc: 'Danh sách 4 yêu cầu (tối đa)' });

    // 4C. Remove one request
    console.log('4C. Thử nghiệm xóa yêu cầu...');
    const deleteBtns = page.locator('button').filter({ hasText: /xóa/i });
    const deleteCount = await deleteBtns.count();
    console.log('Số nút Xóa tìm thấy:', deleteCount);
    if (deleteCount > 0) {
      await deleteBtns.first().click();
      await page.waitForTimeout(400);
    }

    // Run calculate dispatch with updated requests
    await btnDispatch.click();
    await page.waitForTimeout(2000);
    await waitMapTiles(page);

    const ss08 = path.join(REGRESSION_DIR, '08_dispatch_remove_and_calculate.png');
    await page.screenshot({ path: ss08, fullPage: false });
    regressionReport.screenshots.push({ name: '08_dispatch_remove_and_calculate.png', desc: 'Lập lịch sau khi xóa và chỉnh sửa yêu cầu' });
  }

  await desktopContext.close();

  // -------------------------------------------------------------
  // TEST 5: MOBILE WORKSPACE (390x844) REGRESSION
  // -------------------------------------------------------------
  console.log('\n--- 5. Mobile Workspace (390x844) Regression ---');
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

  const mTabDispatch = mPage.locator('button').filter({ hasText: /đón nhiều khách/i }).first();
  await mTabDispatch.click();
  await mPage.waitForTimeout(400);

  // Expand mobile drawer
  const mDrawerToggle = mPage.locator('button').filter({ hasText: /xem thêm|thu gọn/i }).first();
  if (await mDrawerToggle.isVisible()) {
    await mDrawerToggle.click();
    await mPage.waitForTimeout(400);
  }

  const ss09 = path.join(REGRESSION_DIR, '09_mobile_dynamic_dispatch.png');
  await mPage.screenshot({ path: ss09, fullPage: false });
  regressionReport.screenshots.push({ name: '09_mobile_dynamic_dispatch.png', desc: 'Giao diện mobile với điều phối động' });

  await mobileContext.close();
  await browser.close();

  // Save report
  const logPath = path.join(REGRESSION_DIR, 'regression_report.json');
  fs.writeFileSync(logPath, JSON.stringify(regressionReport, null, 2), 'utf-8');
  console.log(`\n[COMPLETE] Regression report saved to ${logPath}`);
}

runRegression().catch((err) => {
  console.error('Fatal error in regression test:', err);
  process.exit(1);
});
