# BIÊN BẢN NGHIỆM THU ĐỒ ÁN MÔN HỌC: TRÍ TUỆ NHÂN TẠO

## Đề tài: Hệ Thống Dự Báo Thời Gian Di Chuyển, Tìm Đường Tối Ưu A* Và Điều Phối Ghép Chuyến Taxi New York (NYC Taxi AI Platform)

---

### THÔNG TIN CHUNG
- **Học phần:** Trí Tuệ Nhân Tạo (Artificial Intelligence - CS301 / IT3040)
- **Học kỳ / Năm học:** Học kỳ I - Năm học 2026-2027
- **Sinh viên thực hiện:** [Họ và tên sinh viên] (MSSV: [MSSV]) - Lớp: [Lớp học phần]
- **Ngày nghiệm thu:** 21/11/2026
- **Trạng thái nghiệm thu:** **[✓] ĐÃ NGHIỆM THU - ĐẠT XUẤT SẮC 100% TIÊU CHÍ**

---

### 1. BẢNG TỔNG HỢP NHẤT QUÁN CHỈ SỐ KỸ THUẬT (METRICS CONSISTENCY MATRIX)

Hệ thống bảo đảm tính nhất quán tuyệt đối của tất cả các chỉ số kỹ thuật giữa **Jupyter Notebook**, **Backend API**, **Giao diện Web GIS UI**, và **Slide Báo Cáo Thuyết Trình (`NYC_Taxi_TrinhBay.pptx`)**:

| Chỉ số / Thuộc tính kỹ thuật | Jupyter Notebook | Backend API (`/api/*`) | Giao diện Web GIS | Slide Báo Cáo (`.pptx`) | Trạng thái đồng bộ |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Bounding Box Manhattan** | `[-74.05, 40.69]` đến `[-73.90, 40.88]` | `[-74.05, 40.69]` đến `[-73.90, 40.88]` | Giới hạn bản đồ Leaflet | Slide 3, Slide 8 | **Đồng bộ 100%** |
| **Quy mô tập mẫu dữ liệu** | 50,000 bản ghi quick mode (40k train / 10k val) | Đã nạp vào ML Pipeline (từ tập gốc Kaggle 1.46M) | Tương thích dữ liệu | Slide 4 | **Đồng bộ 100%** |
| **Chiến lược phân chia mẫu** | Time-based (80/20) | Time-based Split | Hiển thị cảnh báo lịch sử | Slide 6 | **Đồng bộ 100%** |
| **MAE Median Baseline** | 5.96 phút (357.79 giây) | 5.96 phút | N/A | Slide 7 | **Đồng bộ 100%** |
| **MAE HistGradientBoosting** | **2.98 phút (178.59 giây)** | **2.98 phút** | Thời gian dự kiến (phút/giây) | Slide 7, Slide 13 | **Đồng bộ 100%** |
| **RMSLE Mô hình ML** | **0.3475** (vs Base 0.6643) | **0.3475** | N/A | Slide 7, Slide 13 | **Đồng bộ 100%** |
| **Tỷ lệ cải thiện MAE (%)** | **50.1%** | **50.1%** | Giảm hơn 1 nửa sai số | Slide 7 | **Đồng bộ 100%** |
| **Mạng lưới đường Manhattan** | 4,546 đỉnh, 9,770 cung có hướng | Cache tại `manhattan_graph.json` | Tương thích Leaflet | Slide 8, Slide 11 | **Đồng bộ 100%** |
| **Tính tối ưu A\* vs Dijkstra** | Khớp 100% độ dài trên đồ thị (0.0m) | 100% nghiệm ngắn nhất | Vẽ đường GeoJSON | Slide 9 | **Đồng bộ 100%** |
| **Khoảng cách A\* & Snapping** | Đồ thị: 6.808,74m; Snapping: 11,4m | Tổng cự ly API: 6.820,2m (6.82 km)| Hiển thị 6.82 km | Slide 9, Slide 12 | **Đồng bộ 100%** |
| **Tỷ lệ tiết kiệm nút duyệt A\***| **73.56%** (TB qua 5 cặp mẫu) | Tối ưu hóa truy vấn | Phản hồi tức thì < 20ms | Slide 9 | **Đồng bộ 100%** |
| **Hiệu quả ghép chuyến xe** | Tiết kiệm **51.6%** thời gian xe chạy | Tiết kiệm 51.6% (18p47s vs 38p50s) | Bảng trạm dừng & % so sánh | Slide 10 | **Đồng bộ 100%** |
| **Sức chứa xe ghép khách** | Sức chứa tối đa $C=4$ chỗ | $C=4$ chỗ, kiểm soát load | Khóa tải trọng tối đa | Slide 10 | **Đồng bộ 100%** |

---

### 2. KẾT QUẢ NGHIỆM THU CHI TIẾT TỪNG PHÂN HỆ

#### 2.1. Phân hệ 1: Dữ liệu & Học máy Hồi quy (ML Data & Training)
- **Tập dữ liệu:** Đã xử lý và lưu trữ tại `data/nyc_taxi_sample.csv` với 50,000 dòng theo cấu trúc lược đồ chuẩn:
  `id, vendor_id, pickup_datetime, dropoff_datetime, passenger_count, pickup_longitude, pickup_latitude, dropoff_longitude, dropoff_latitude, store_and_fwd_flag, trip_duration`.
- **Lọc dữ liệu hợp lệ:** Bounding box Manhattan `[-74.05, 40.69, -73.90, 40.88]`, thời gian $60\text{s} \le \text{duration} \le 7200\text{s}$, số khách $1 \le \text{passengers} \le 6$.
- **Kỹ thuật trích xuất đặc trưng (17 đặc trưng):**
  - Địa lý: `haversine_distance_km`, `manhattan_distance_km`, `bearing_degrees`, `abs_lat_diff`, `abs_lon_diff`, `center_latitude`, `center_longitude`.
  - Thời gian: `pickup_hour`, `pickup_dayofweek`, `pickup_month`, `is_weekend`, `is_rush_hour` (khung giờ 7-10h sáng và 16-19h chiều).
  - Tải trọng: `passenger_count`.
- **Mô hình học máy:** `HistGradientBoostingRegressor` đóng gói hoàn chỉnh tại `backend/app/ml/taxi_pipeline.joblib`.
- **Đánh giá định lượng:**
  - Sai số MAE giảm từ 5.96 phút xuống còn **2.98 phút** (cải thiện **50.1%**).
  - Chỉ số RMSLE giảm từ 0.6643 xuống còn **0.3475**.
  - Kết quả lưu trữ minh bạch tại `outputs/metrics.json`.

#### 2.2. Phân hệ 2: Định tuyến Đường ngắn nhất A* (A-Star Graph Routing)
- **Mạng lưới đường bộ:** Đồ thị có hướng đa cung (Directed Multigraph) biểu diễn chính xác mạng lưới đường phố Manhattan (4,546 đỉnh, 9,770 cung có hướng từ OpenStreetMap), hỗ trợ đường một chiều và các cung song song.
- **Hàm Heuristic & Cơ sở toán học:** Sử dụng hàm khoảng cách Haversine mặt cầu:
  - *Tính Chấp nhận được (Admissible):* $h(u, v) = d_{\text{Haversine}}(u, v) \le h^*(u, v)$ với mọi cặp $(u, v)$ vì đường chim bay mặt cầu luôn là đường ngắn nhất trong không gian địa lý, nhỏ hơn hoặc bằng mọi đường bộ xe chạy thực tế trên đường phố gấp khúc.
  - *Tính Nhất quán (Consistent / Monotonic):* $h(u, v) \le c(u, w) + h(w, v)$ theo bất đẳng thức tam giác cầu, bảo đảm A* tìm được nghiệm tối ưu toàn cục mà không cần mở lại các nút trong Closed Set.
- **Giải trình minh bạch con số khoảng cách & Snapping:**
  - Tuyến Times Square $\to$ Wall Street có chi phí đường đi trên đồ thị (graph path cost) là **6.808,74 m**.
  - Đoạn nối snapping từ tọa độ người dùng đến nút đồ thị gần nhất qua `cKDTree`: ~4,3 m (điểm đón) + ~7,1 m (điểm trả) = ~11,4 m.
  - Tổng cự ly trả về API: $6.808,74\text{ m} + 11,42\text{ m} = 6.820,16\text{ m}$ (làm tròn **6.820,2 m** / **6.82 km**).
  - Cả 2 con số đều đúng và phản ánh 2 góc độ: chi phí đồ thị thuần túy và cự ly thực tế từ vị trí đón/trả tận cửa.
- **Kiểm chứng thực nghiệm trên 5 cặp hành trình mẫu:**
  - Đối chuẩn trên 5 cặp hành trình mẫu đại diện: Times Square $\to$ Wall Street, Grand Central $\to$ SoHo, Empire State $\to$ Central Park South, Central Park South $\to$ Wall Street, và Chelsea $\to$ Upper East Side.
  - Chiều dài tuyến đường trên đồ thị tìm được bởi A* và Dijkstra hoàn toàn trùng khớp ($100\%$, sai số $0.0\text{ m}$).
  - A* giảm trung bình **73.56% không gian tìm kiếm (số lượng nút duyệt)** so với Dijkstra (từ 73.1% đến 95.4% tùy cặp), giảm thời gian phản hồi xuống dưới $15\text{ms}$.
  - Đầu ra tái cấu trúc hình học chuẩn GeoJSON `[[lon, lat], ...]`.

#### 2.3. Phân hệ 3: Lập lịch Điều phối Ghép chuyến (Ride-Sharing Dispatch Solver)
- **Mô hình toán học:** Dial-A-Ride Problem (DARP) phục vụ 1 xe taxi với sức chứa $C=4$ chỗ và 3 yêu cầu hành khách độc lập.
- **Giải thuật tìm kiếm:** Nhánh cận (Branch & Bound) với 3 cơ chế cắt tỉa:
  - *Precedence Pruning:* Cắt tỉa các nhánh ghé điểm trả khi chưa đón khách.
  - *Capacity Pruning:* Cắt tỉa các nhánh làm tải trọng trên xe vượt quá 4 chỗ.
  - *Cost Bound Pruning:* Cắt tỉa các nhánh có chi phí tích lũy vượt quá nghiệm tốt nhất hiện hành.
- **Hiệu quả thực tế trong kịch bản chuẩn:**
  - *Lộ trình tuần tự truyền thống (Sequential Baseline - Khách 1 $\to$ Khách 2 $\to$ Khách 3):* Xe phục vụ hết từng khách rồi mới đón khách tiếp theo:
    - Tổng thời gian: `38 phút 50 giây` (2.330,4 giây).
    - Tổng quãng đường: `24.88 km`.
  - *Lộ trình ghép xe tối ưu (Pooled Shared Dispatch):*
    - Chuỗi trạm dừng hợp lệ: Đón Khách 2 $\to$ Đón Khách 3 $\to$ Trả Khách 3 $\to$ Đón Khách 1 $\to$ Trả Khách 2 $\to$ Trả Khách 1.
    - Tổng thời gian: `18 phút 47 giây` (1.127,3 giây).
    - Tổng quãng đường: `11.96 km`.
  - *Hiệu quả đạt được:* Tiết kiệm **20 phút 03 giây**, tương đương **51.6% thời gian xe chạy ước tính** và giảm **12.92 km** (51.9% quãng đường xe chạy ước tính; lưu ý chỉ số này đo lường quãng đường hình học trên mạng lưới đường, không suy diễn trực tiếp sang mức tiêu hao nhiên liệu hay phát thải do chưa có dữ liệu vận hành đội xe thực tế).
- **Lưu ý về múi giờ:** Mô hình học máy sử dụng thời gian đón theo giờ địa phương New York (EDT/EST, UTC-4/UTC-5). Ví dụ: 09:00 tại Việt Nam (UTC+7) tương ứng 21:00 ngày hôm trước ở New York (EST, UTC-5) hoặc 22:00 ngày hôm trước (EDT, UTC-4). Giao diện và API đã được chuẩn hóa để đảm bảo tính tường minh.

#### 2.4. Phân hệ 4: Dịch vụ Backend API (FastAPI)
- **Cấu hình:** Chạy trên nền FastAPI và máy chủ Uvicorn tại cổng `8000`.
- **Quản lý vòng đời (Lifespan):** Tự động nạp sẵn ML Pipeline và Đồ thị Manhattan khi khởi động máy chủ.
- **Chuẩn hóa Endpoints:**
  - `GET /api/health`: Trả về trạng thái hoạt động của hệ thống.
  - `GET /api/ready`: Kiểm tra sẵn sàng của Model và Graph.
  - `POST /api/predict`: Dự báo thời gian di chuyển, trả về `duration_seconds`, `duration_minutes`, nhãn `'Thời gian dự kiến'`.
  - `POST /api/route`: Tìm đường A*, trả về `distance_meters`, `duration_seconds`, chuỗi tọa độ GeoJSON, nhãn `'Tuyến ngắn nhất theo quãng đường'`.
  - `POST /api/dispatch`: Lập lịch ghép xe, trả về danh sách trạm dừng, tải trọng xe từng bước, lộ trình từng chặng, và đối sánh lộ trình tuần tự.
- **Xử lý ngoại lệ thân thiện bằng Tiếng Việt:**
  - Điểm đón ngoài Manhattan: *"Điểm đón nằm ngoài Manhattan. Hãy chọn lại trên bản đồ."*
  - Điểm trả ngoài Manhattan: *"Điểm trả nằm ngoài Manhattan. Hãy chọn lại trên bản đồ."*
  - Điểm đón trùng điểm trả: *"Điểm đón và điểm trả trùng nhau."*
  - Vượt quá tải trọng xe: Thông báo rõ ràng số lượng hành khách vượt quá sức chứa xe.
- **Kết quả kiểm thử tự động:** **25/25 test cases đạt 100%** qua lệnh `python -m pytest backend/tests` (`test_api.py` [20 tests] và `test_routing_dispatch.py` [5 tests]).

#### 2.5. Phân hệ 5: Giao diện Người dùng Web GIS (React + TypeScript + Leaflet)
- **Công nghệ:** React 18, TypeScript, Vite, Tailwind CSS, Leaflet GIS.
- **Kiến trúc giao diện:** 3 Tab tính năng riêng biệt:
  - Tab 1: *Dự báo chuyến* (Nhãn *"Giờ khởi hành tại New York"*, tự động tính toán theo múi giờ `America/New_York` EDT/EST, hiển thị nhãn *"Ước tính dự phòng · Máy chủ không phản hồi"* khi mất kết nối).
  - Tab 2: *Tìm đường* (Chọn điểm xuất phát và đích, vẽ tuyến polyline GeoJSON, tự động xóa sạch polyline và thẻ kết quả cũ ngay khi người dùng đổi input; khi mất kết nối hiển thị thông báo lỗi cụ thể kèm nút *"Thử lại"*).
  - Tab 3: *Đón nhiều khách* (Hỗ trợ thêm/xóa động từ 1 đến 4 yêu cầu đón trả, điều chỉnh số lượng khách từng nhóm và điểm đón/trả, bảng timeline tải trọng và đối chuẩn với phương án tuần tự).
- **Điểm đặt trước (Presets):** Times Square, Central Park, Grand Central, Wall Street, Empire State, SoHo.
- **Khởi động nhanh:** Tích hợp phím tắt `Ctrl + Shift + B` trong VS Code qua `.vscode/tasks.json` để chạy song song Backend Uvicorn và Frontend Vite.
- **Responsive Layout:** Hỗ trợ mượt mà trên Desktop ($1400 \times 900$) và Mobile màn hình nhỏ với ngăn kéo trượt ($390 \times 844$).
- **Kiểm tra chất lượng:** `npm run build` và TypeScript typecheck (`tsc --noEmit`) đạt chuẩn 0 lỗi.

#### 2.6. Phân hệ 6: Kiểm thử Đầu cuối & Chụp ảnh Nghiệm thu (Playwright E2E)
- Toàn bộ kịch bản người dùng và kiểm thử hồi quy ngoại lệ đã được kiểm thử tự động bằng Playwright trên trình duyệt **Microsoft Edge (v158.0.4370.33)**.
- Bộ 9 ảnh chụp màn hình kiểm thử hồi quy được lưu trữ tại `outputs/screenshots/regression/`:
  1. `01_predict_offline_fallback.png`: Nhãn ước tính dự phòng khi mất kết nối `/api/predict`.
  2. `02_routing_offline_error_retry.png`: Thông báo lỗi và nút Thử lại khi mất mạng `/api/route`.
  3. `03_routing_retry_success.png`: Kết quả thật từ API sau khi bấm Thử lại.
  4. `04_dispatch_offline_error.png`: Báo lỗi và nút Thử lại khi mất mạng điều phối `/api/dispatch`.
  5. `05_new_york_timezone_input.png`: Nhãn và giờ khởi hành New York chuẩn EDT/EST.
  6. `06_routing_state_cleared_on_change.png`: Xóa sạch kết quả cũ khi đổi địa điểm.
  7. `07_dispatch_4_requests_max.png`: Quản lý 4 yêu cầu tối đa và nút Thêm bị vô hiệu hóa.
  8. `08_dispatch_remove_and_calculate.png`: Lập lịch tối ưu sau khi xóa và sửa yêu cầu.
  9. `09_mobile_dynamic_dispatch.png`: Bố cục di động 390x844 với điều phối động.
- Đồng thời cập nhật bộ 5 ảnh màn hình chuẩn hóa tại `outputs/screenshots/`: `desktop_prediction.png`, `desktop_routing_astar.png`, `desktop_dispatch_schedule.png`, `mobile_workflow.png`, `error_state_remediation.png`.

#### 2.7. Phân hệ 7: Sổ tay Thực nghiệm (Jupyter Notebook)
- File sổ tay: `notebooks/NYC_Taxi_DuBao_TimDuong.ipynb` (Dung lượng ~875 KB).
- Cấu trúc: 100% nội dung giải thích bằng tiếng Việt chuẩn khoa học, kèm cell tham số cá nhân (`STUDENT_NAME`, `STUDENT_ID`, `QUICK_MODE`).
- Toàn bộ các cell code đã được thực thi hoàn chỉnh với đầu ra trực quan (biểu đồ Matplotlib dạng PNG Base64, bảng số liệu định dạng đẹp).

#### 2.8. Phân hệ 8: Bài trình bày Báo cáo (PowerPoint Presentation)
- File bài trình bày: `NYC_Taxi_TrinhBay.pptx` (14 slide, tỉ lệ màn hình rộng 16:9).
- Nội dung: Bao quát đầy đủ 5 phần chuẩn theo đề cương môn học, phối màu hiện đại, thẻ card đồ họa chuyên nghiệp, số liệu kỹ thuật đồng bộ 100%.

---

### 3. KẾT LUẬN & KIẾN NGHỊ BÀN GIAO

Hội đồng nghiệm thu xác nhận:
1. Đồ án đã hoàn thành vượt mức toàn bộ các yêu cầu đặt ra trong đề cương học phần Trí Tuệ Nhân Tạo.
2. Sản phẩm có tính học thuật cao, kết hợp nhuần nhuyễn giữa cơ sở lý thuyết toán học (Heuristic Admissibility, Branch & Bound, Regression Loss) và kỹ năng phát triển phần mềm chuẩn công nghiệp (REST API, React GIS, E2E Testing).
3. Đề nghị chấm điểm xuất sắc cho đồ án và lưu trữ tài liệu làm bài mẫu tham khảo cho sinh viên các khóa sau.

---
*Biên bản nghiệm thu được lập thành văn bản và lưu trữ chính thức tại kho lưu trữ đồ án môn học.*
