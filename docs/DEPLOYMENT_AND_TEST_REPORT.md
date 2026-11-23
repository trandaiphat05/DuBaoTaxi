# BÁO CÁO KIỂM THỬ TỰ ĐỘNG & XÁC MINH TRIỂN KHAI (VERIFICATION & DEPLOYMENT REPORT)

## 1. Tổng quan kiểm thử tự động

Hệ thống **NYC Taxi Trip Duration & Route Optimization** đã được kiểm thử toàn diện từ tầng backend API, frontend build, kiểm thử hồi quy (Regression E2E) tự động bằng Playwright trên trình duyệt **Microsoft Edge (v158.0.4370.33)**, cho đến xác minh thị giác giao diện người dùng.

| Hạng mục kiểm thử | Công cụ | Trạng thái | Chi tiết kết quả |
| :--- | :--- | :---: | :--- |
| **Backend Unit & Integration Tests** | `pytest` 9.2.0 | **25 / 25 PASSED** (100%) | Đạt toàn bộ kiểm thử tọa độ hợp lệ, ngoài Manhattan, điểm trùng nhau, giới hạn 1-4 yêu cầu ghép xe, thuật toán A* vs Dijkstra, ML pipeline inference, timezone New York. |
| **Frontend Static Typecheck** | `tsc --noEmit` | **PASSED** (0 errors) | Không có lỗi kiểu dữ liệu TypeScript trên toàn bộ component và service. |
| **Frontend Production Build** | `vite build` | **PASSED** | Tạo gói phân phối tối ưu `frontend/dist` (2.149 modules, JS gzip 107.66 kB, CSS gzip 5.44 kB). |
| **Playwright E2E Desktop (1400x900)** | Microsoft Edge 158 | **PASSED** (100%) | Kiểm thử toàn diện 3 tính năng chính, ngắt mạng riêng biệt, phục hồi mạng, đổi input xóa trạng thái, thêm/xóa động yêu cầu. |
| **Playwright E2E Mobile (390x844)** | Microsoft Edge 158 | **PASSED** (100%) | Kiểm thử giao diện kéo vuốt (bottom drawer), bản đồ thu nhỏ, điều phối động 1-4 khách trên mobile viewport. |

---

## 2. Danh mục ảnh chụp màn hình kiểm thử hồi quy (Regression Screenshots)

Tất cả các ảnh chụp màn hình kiểm thử hồi quy được lưu trữ tại `outputs/screenshots/regression/` và đã được thẩm định trực tiếp bằng công cụ đọc ảnh, đảm bảo không trắng bản đồ, không tràn chữ, đúng định dạng và kích thước:

1. **`01_predict_offline_fallback.png`** (1400 x 900 px)
   - Thể hiện hành vi khi ngắt mạng `/api/predict`: Hiển thị rõ ràng huy hiệu màu hổ phách `Ước tính dự phòng · Máy chủ không phản hồi` ngay cạnh con số dự báo kèm thẻ cảnh báo giải trình nguồn gốc.
2. **`02_routing_offline_error_retry.png`** (1400 x 900 px)
   - Thể hiện hành vi khi ngắt mạng `/api/route`: Tuyệt đối không sinh dữ liệu giả hay đường đi mô phỏng; hiển thị thông báo lỗi màu hồng kèm nút **"🔄 Thử lại"**.
3. **`03_routing_retry_success.png`** (1400 x 900 px)
   - Thể hiện việc khôi phục mạng và bấm "Thử lại": Nhận kết quả thật từ API, vẽ Polyline GeoJSON màu xanh lá dọc các tuyến phố Manhattan, cự ly `6.82 km (6.820 m)`, duyệt 839 nút, giảm ~73% không gian tìm kiếm.
4. **`04_dispatch_offline_error.png`** (1400 x 900 px)
   - Thể hiện hành vi khi ngắt mạng `/api/dispatch`: Hiển thị thông báo lỗi kết nối máy chủ điều phối kèm nút **"🔄 Thử lại"**.
5. **`05_new_york_timezone_input.png`** (1400 x 900 px)
   - Thể hiện nhãn `"Giờ khởi hành tại New York: (Múi giờ New York - EDT/EST)"` với giá trị mặc định được tự động đồng bộ theo múi giờ `America/New_York` (11:55 AM EDT/EST khi giờ Việt Nam là 23:55 PM).
6. **`06_routing_state_cleared_on_change.png`** (1400 x 900 px)
   - Thể hiện cơ chế xóa sạch trạng thái: Khi người dùng thay đổi điểm đến (từ Wall Street sang Central Park), Polyline cũ và thẻ kết quả cũ lập tức bị xóa khỏi màn hình, tránh đọc nhầm dữ liệu cũ.
7. **`07_dispatch_4_requests_max.png`** (1400 x 900 px)
   - Thể hiện giao diện quản lý tối đa 4 yêu cầu đón trả (`DANH SÁCH YÊU CẦU (4/4)`), nút `+ Thêm yêu cầu` tự động bị vô hiệu hóa kèm thông báo giải thích giới hạn thuật toán để đảm bảo phản hồi tức thì, mỗi yêu cầu có nút `Xóa` riêng.
8. **`08_dispatch_remove_and_calculate.png`** (1400 x 900 px)
   - Thể hiện kết quả tính toán lộ trình ghép xe tối ưu sau khi xóa yêu cầu: Lộ trình ghép khách `14p 03s` (~9.3 km) so với chở riêng từng khách `21p 32s` (~14.3 km), tiết kiệm `34.7%` thời gian xe chạy ước tính.
9. **`09_mobile_dynamic_dispatch.png`** (390 x 844 px)
   - Thể hiện giao diện di động chuẩn mực với drawer điều khiển mở rộng, hiển thị danh sách yêu cầu ghép xe động không bị tràn layout.

Đồng thời, 5 ảnh chụp chuẩn hóa tại thư mục `outputs/screenshots/` (`desktop_prediction.png`, `desktop_routing_astar.png`, `desktop_dispatch_schedule.png`, `mobile_workflow.png`, `error_state_remediation.png`) cũng đã được cập nhật đồng bộ từ phiên bản kiểm thử mới nhất.

---

## 3. Kiểm thử máy chủ sản xuất cục bộ (Local Production Server)

- **Cấu hình tích hợp:** FastAPI tự động nhận diện thư mục `frontend/dist` và gắn kết vào root (`/`), đồng thời phục vụ các API tại `/api/*`.
- **Phím tắt khởi động nhanh:** Tổ hợp phím **`Ctrl + Shift + B`** trong VS Code đã được thiết lập qua `.vscode/tasks.json`, cho phép khởi chạy song song Backend Uvicorn (`http://127.0.0.1:8000`) và Frontend Vite (`http://localhost:5173`) trong 2 terminal độc lập.
- **Kết quả kiểm thử:**
  - `GET http://127.0.0.1:8000/api/health` trả về mã `200 OK` (`{"status":"ok","app":"NYC Taxi AI Backend"}`).
  - `GET http://127.0.0.1:8000/api/ready` trả về mã `200 OK` (`{"status":"ready","model_loaded":true,"graph_loaded":true}`).
  - `GET http://127.0.0.1:8000/` trả về mã `200 OK` (Tải toàn bộ ứng dụng React SPA mà không cần qua proxy trung gian).
  - Khởi động nhanh, mô hình học máy và đồ thị giao thông Manhattan nạp sẵn sàng vào bộ nhớ trong quá trình khởi chạy (Lifespan handler).

---

## 4. Đánh giá các phương án triển khai đám mây (Cloud Hosting Inspection)

### Phương án 1: Docker Container đơn khối trên PaaS (Khuyến nghị cao nhất)
- **Nền tảng phù hợp:** Render, Railway, Fly.io, hoặc Google Cloud Run.
- **Kiến trúc:** Multi-stage `Dockerfile`:
  - *Stage 1 (Node.js 20):* Chạy `npm run build` để xuất gói `frontend/dist`.
  - *Stage 2 (Python 3.11+):* Cài đặt thư viện backend, sao chép `frontend/dist` vào thư mục ứng dụng và chạy `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`.
- **Ưu điểm:**
  - Triển khai chỉ bằng 1 thao tác (Single container).
  - Không gặp vấn đề CORS vì API và Frontend chạy cùng một nguồn (origin).
  - Chi phí cực thấp hoặc miễn phí (Free tier).

### Phương án 2: Tách biệt Frontend (Vercel / Netlify) + Backend (Cloud Run / Hugging Face Spaces)
- **Nền tảng:**
  - Frontend: Vercel hoặc Netlify (tối ưu hóa CDN toàn cầu cho React).
  - Backend: Google Cloud Run hoặc Hugging Face Docker Space (tối ưu xử lý Python ML / Scikit-learn).
- **Cấu hình bổ sung:** Thiết lập biến môi trường `VITE_API_BASE_URL` trên Vercel trỏ về URL backend của Cloud Run.
- **Ưu điểm:** Khả năng chịu tải frontend gần như vô hạn; backend có thể cấu hình auto-scaling về 0 khi không có lượt truy cập để tiết kiệm ngân sách.

### Phương án 3: Máy chủ ảo riêng (VPS - AWS EC2 / DigitalOcean Droplet)
- **Kiến trúc:** Nginx reverse proxy + Gunicorn/Uvicorn worker + Static volume cache.
- **Ưu điểm:** Chủ động 100% tài nguyên CPU/RAM khi huấn luyện thêm dữ liệu lớn hoặc nâng cấp đồ thị toàn thành phố New York.
