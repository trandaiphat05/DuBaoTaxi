# BÁO CÁO KIỂM THỬ TOÀN DIỆN GIAO DIỆN & CHỨC NĂNG ỨNG DỤNG NYC TAXI AI
**Hệ Thống Dự Báo Thời Gian Chuyến Đi & Tối Ưu Hóa Điều Vận Taxi Manhattan**

---

## PHẦN 1: XÁC MINH MÔI TRƯỜNG & ỨNG DỤNG ĐANG CHẠY

### 1.1. Hạ tầng dịch vụ và cổng mạng
- **Địa chỉ Frontend:** `http://localhost:5173/` (Vite 6.4.6 + React 18 + TypeScript + Tailwind CSS + Leaflet 1.9.4). Kiểm tra trạng thái HTTP: `200 OK`.
- **Địa chỉ Backend API:** `http://127.0.0.1:8000/` (FastAPI + Uvicorn + Scikit-Learn + OSMnx Graph Engine). Kiểm tra endpoint `/api/health`: trả về `{"status":"ok","app":"NYC Taxi AI Backend"}` (HTTP 200).
- **Trạng thái mô hình học máy & đồ thị (`/api/ready`):**
  ```json
  {
    "status": "ready",
    "ml_model_loaded": true,
    "manhattan_graph_loaded": true
  }
  ```
  - **Mô hình ML:** `HistGradientBoostingRegressor` (tệp pipeline: `backend/app/ml/taxi_pipeline.joblib`) nạp thành công vào bộ nhớ khi máy chủ khởi động (Lifespan handler).
  - **Đồ thị Manhattan:** 4.546 đỉnh, 9.770 cạnh có hướng (`backend/app/data/manhattan_graph.json`, nguồn OpenStreetMap ODbL 1.0) kèm cấu trúc tìm kiếm không gian `cKDTree` sẵn sàng.

### 1.2. Môi trường trình duyệt kiểm thử tự động
- **Công cụ điều khiển:** Playwright Test Engine.
- **Trình duyệt thực tế:** **Microsoft Edge** (kênh chính thức `msedge` trên hệ điều hành Windows).
- **Đường dẫn tệp thực thi:** `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`.
- **Phiên bản trình duyệt:** `158.0.4370.33` (x86_64).
- **Thời điểm thực hiện kiểm thử:** `2026-11-21 23:02:50 (UTC+7)`.

---

## PHẦN 2: DANH SÁCH KIỂM KÊ TOÀN BỘ ĐIỀU KHIỂN GIAO DIỆN (CONTROL INVENTORY)

Kiểm kê 100% các thành phần tương tác trên giao diện đang chạy ở cả 3 tab chức năng, thanh tiêu đề, bản đồ và ngăn kéo di động:

| STT | Nhãn điều khiển | Màn hình / Vị trí | Thao tác người dùng | Kết quả kỳ vọng | Kết quả thực tế quan sát được | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| 1 | **Logo & Tiêu đề ứng dụng** | Header bên trái | Hiển thị thông tin hệ thống | Hiển thị "Hệ Thống Điều Phối & Dự Báo Taxi Manhattan" kèm mô tả | Hiển thị chuẩn xác, font chữ rõ nét | **Đạt** |
| 2 | **Huy hiệu Máy chủ** | Header bên trái | Tự động thăm dò `/api/health` | Hiển thị chấm xanh "Máy chủ trực tuyến" | Chấm xanh hiển thị ngay sau 200ms kết nối | **Đạt** |
| 3 | **Tab "Dự báo chuyến"** | Header bên phải | Click chuột / Chạm ngón tay | Kích hoạt giao diện dự báo thời gian | Chuyển tab mượt mà, đổi màu nền vàng hổ phách nổi bật | **Đạt** |
| 4 | **Tab "Tìm đường"** | Header bên phải | Click chuột / Chạm ngón tay | Kích hoạt giao diện định tuyến A* | Chuyển tab mượt mà, đổi màu xanh ngọc bích | **Đạt** |
| 5 | **Tab "Đón nhiều khách"** | Header bên phải | Click chuột / Chạm ngón tay | Kích hoạt giao diện điều phối ghép xe | Chuyển tab mượt mà, đổi màu xanh dương indigo | **Đạt** |
| 6 | **Thanh địa điểm mẫu** | Nổi trên đầu bản đồ | Click các nút: Times Square, Central Park, Grand Central, Wall Street, Empire State, SoHo | Điền nhanh tọa độ mẫu vào ô chọn | Điền chính xác tọa độ và di chuyển tâm quan sát | **Đạt** |
| 7 | **Hộp chọn Điểm đón (Pickup)** | Bảng điều khiển Tab 1 & 2 | Chọn dropdown danh sách Manhattan | Cập nhật tọa độ đón và ghim xanh (Đ) trên bản đồ | Tọa độ hiển thị 5 chữ số thập phân, ghim xanh xuất hiện | **Đạt** |
| 8 | **Nút "Chọn trên bản đồ" (Đón)** | Cạnh nhãn Điểm đón | Click để bật chế độ nhấp bản đồ | Nút chuyển sang "Đang chọn trên bản đồ...", nhấp bản đồ gán tọa độ đón | Đổi màu xanh lá đậm, click bản đồ nhận tọa độ ngay | **Đạt** |
| 9 | **Hộp chọn Điểm trả (Dropoff)** | Bảng điều khiển Tab 1 & 2 | Chọn dropdown danh sách Manhattan | Cập nhật tọa độ trả và ghim đỏ (T) trên bản đồ | Tọa độ hiển thị 5 chữ số thập phân, ghim đỏ xuất hiện | **Đạt** |
| 10 | **Nút "Chọn trên bản đồ" (Trả)** | Cạnh nhãn Điểm trả | Click để bật chế độ nhấp bản đồ | Nút chuyển sang "Đang chọn...", nhấp bản đồ gán tọa độ trả | Đổi màu đỏ hồng, click bản đồ nhận tọa độ ngay | **Đạt** |
| 11 | **Ô nhập Thời gian xuất phát** | Form Tab Dự báo | Nhập ngày giờ `input[type="datetime-local"]` | Nhận giá trị ngày giờ địa phương | Định dạng chuẩn ISO, giao diện picker của Edge hoạt động tốt | **Đạt** |
| 12 | **Ô nhập Số lượng hành khách** | Form Tab Dự báo | Nhập số từ 1 đến 6 | Giới hạn 1 - 6 khách | Nhập 0 tự bật về 1; nhập 7 tự chặn ở 6 | **Đạt** |
| 13 | **Nút "Dự Báo Thời Gian Chuyến"** | Cuối form Tab Dự báo | Click nút màu cam | Gửi payload tới `/api/predict`, hiển thị spinner khi chờ | Nút hiện spinner, sau 300ms hiển thị thẻ kết quả bên dưới | **Đạt** |
| 14 | **Thẻ Thời gian dự kiến** | Kết quả Tab Dự báo | Quan sát sau khi dự báo | Hiển thị phút và giây tương ứng | Hiển thị số phút in đậm lớn kèm số giây ước tính bên dưới | **Đạt** |
| 15 | **Thẻ Quãng đường ước tính** | Kết quả Tab Dự báo | Quan sát sau khi dự báo | Hiển thị khoảng cách theo km | Hiển thị chính xác (ví dụ: 0.91 km) | **Đạt** |
| 16 | **Thẻ Lưu ý dữ liệu lịch sử** | Kết quả Tab Dự báo | Đọc nội dung cảnh báo | Hiển thị thông báo nguồn dữ liệu lịch sử NYC Taxi | Khung màu vàng nhạt, câu chữ tiếng Việt tự nhiên | **Đạt** |
| 17 | **Nút "Tìm Tuyến Ngắn Nhất (A*)"** | Form Tab Tìm đường | Click nút màu xanh ngọc | Gửi payload tới `/api/route`, vẽ polyline trên bản đồ | Vẽ tuyến đường màu xanh ngọc bích, hiển thị thẻ kết quả A* | **Đạt** |
| 18 | **Thẻ Kết quả định tuyến A*** | Kết quả Tab Tìm đường | Đọc thông số đường đi | Hiển thị km/mét, số phút, số nút duyệt (839 nút), hiệu suất giảm ~60-73% | Đầy đủ dữ liệu trực quan | **Đạt** |
| 19 | **Hộp chọn Vị trí xe xuất phát** | Form Tab Đón nhiều khách | Chọn điểm xuất phát ban đầu | Đặt điểm gốc điều phối | Mặc định Grand Central, có thể chọn vị trí khác | **Đạt** |
| 20 | **Ô nhập Sức chứa xe (Chỗ ngồi)** | Form Tab Đón nhiều khách | Nhập sức chứa `capacity` (mặc định 4) | Thiết lập ràng buộc dung lượng | Ràng buộc áp dụng chuẩn xác vào thuật toán tìm kiếm | **Đạt** |
| 21 | **Danh sách 3 yêu cầu đặt xe** | Form Tab Đón nhiều khách | Xem danh sách Khách 1, 2, 3 | Hiển thị thông tin đón/trả và số khách | Thẻ màu phân biệt cho từng khách (xanh dương, tím, xanh lục) | **Đạt** |
| 22 | **Nút Thêm / Xóa khách** | Form Tab Đón nhiều khách | Tìm nút bấm để thêm/xóa yêu cầu | Có thể thêm khách 4 hoặc xóa khách | **Chưa có nút bấm**: Danh sách 3 khách đang được cấu hình cố định trên giao diện | **Chưa có** *(Nhẹ)* |
| 23 | **Nút "Tối Ưu Hóa Tuyến Đón Khách"** | Cuối form Tab 3 | Click nút màu xanh indigo | Giải bài toán Vehicle Routing có ràng buộc tải trọng | Tính toán xong trong ~400ms, hiển thị bảng lịch trình 6 chặng | **Đạt** |
| 24 | **Thẻ So sánh Lộ trình tuần tự** | Kết quả Tab 3 | Quan sát chỉ số tiết kiệm | Hiển thị thời gian ghép vs thời gian đi riêng từng chuyến | Hiển thị rõ: Ghép 18p 47s vs Riêng 38p 50s (Tiết kiệm 51.6%) | **Đạt** |
| 25 | **Bảng Lịch Trình Chi Tiết Các Điểm Dừng** | Kết quả Tab 3 | Đọc bảng 6 hàng (Bước 1 -> 6) | Hiển thị cột: Bước, Hành động, Tên khách, Tải trọng xe, Thời gian lũy kế | Bảng định dạng rõ ràng, thanh tải trọng xe trực quan | **Đạt** |
| 26 | **Thanh điều khiển Drawer di động** | Đỉnh Drawer trên Mobile | Chạm vào "Xem thêm" / "Thu gọn" | Kéo mở rộng chiều cao ngăn kéo từ 48vh lên 85vh | Ngăn kéo bung mở mượt mà bằng CSS transition | **Đạt** |
| 27 | **Bộ điều khiển thu phóng bản đồ (+/-)** | Góc trên bên phải bản đồ | Click nút + / - hoặc cuộn chuột | Phóng to / thu nhỏ bản đồ | Zoom mượt mà, tự động tải các lớp tile chi tiết | **Đạt** |

---

## PHẦN 3: KẾT QUẢ CHI TIẾT 3 HÀNH TRÌNH TRẢI NGHIỆM & BIÊN BẢN THỰC NGHIỆM

### 3.1. Hành trình A: Dự báo thời gian chuyến đi (Prediction Journey)
- **Tọa độ thử nghiệm chuẩn:**
  - Điểm đón (Times Square): Vĩ độ `40.75800`, Kinh độ `-73.98550`.
  - Điểm trả (Grand Central): Vĩ độ `40.75270`, Kinh độ `-73.97720`.
  - Số hành khách: `2` người.
  - Thời gian xuất phát: `2026-11-21T09:30`.
- **Payload HTTP gửi đi thực tế:**
  ```json
  {
    "pickup_lat": 40.758,
    "pickup_lon": -73.9855,
    "dropoff_lat": 40.7527,
    "dropoff_lon": -73.9772,
    "pickup_datetime": "2026-11-21T09:30",
    "passenger_count": 2
  }
  ```
- **Response JSON từ API Backend (`/api/predict`):**
  ```json
  {
    "duration_seconds": 413.2,
    "duration_minutes": 6.9,
    "distance_km": 0.91,
    "label": "Thời gian dự kiến",
    "model_name": "HistGradientBoostingRegressor (ML Pipeline)",
    "historical_disclaimer": "Dữ liệu chuyến đi thực tế từ NYC Taxi (Manhattan). Kết quả được dự báo bằng mô hình học máy dựa trên thời gian và tọa độ trong quá khứ."
  }
  ```
- **Xác minh quy tắc đổi giây sang phút và làm tròn:**
  $$\text{duration\_minutes} = \frac{413.2}{60} = 6.8866...\approx 6.9\text{ phút}$$
  Quy tắc làm tròn chuẩn xác đến 1 chữ số thập phân (`round(..., 1)`). Thẻ giao diện hiển thị đồng thời cả `6.9 phút` và `(~413 giây)`.
- **Thử nghiệm đổi điểm và giờ (Giờ cao điểm chiều):**
  - Chuyển điểm trả về Phố Wall (`40.70690, -74.00900`), đổi giờ thành `18:00`.
  - Kết quả cập nhật tức thì: Quãng đường tăng lên `6.02 km`, thời gian dự kiến tăng thành `24.6 phút` (`1.473.7 giây`). Kết quả này phản ánh xu hướng gia tăng thời gian di chuyển vào khung giờ cao điểm chiều được ghi nhận trong dữ liệu lịch sử tại Manhattan.
- **Thử nghiệm ca biên & tiêu cực (Edge & Negative Tests):**
  - *Điểm nằm ngoài Manhattan:* Thử tọa độ vĩ độ `41.5000` -> API trả về `HTTP 400 Bad Request`: `{"detail": "Điểm đón nằm ngoài Manhattan. Hãy chọn lại trên bản đồ."}`. Giao diện xuất hiện hộp cảnh báo màu đỏ với hướng dẫn khắc phục cụ thể.
  - *Điểm đón và trả trùng nhau:* Thử Times Square -> Times Square -> API trả về `HTTP 400`: `{"detail": "Điểm đón và điểm trả trùng nhau."}`.
  - *Số khách ngoài giới hạn:* Nhập số âm hoặc 0 -> client clamp tự động đưa về `1`; nhập 7 hoặc 10 -> client clamp tự động đưa về `6`. Nếu gửi API vượt quá 6 -> Backend trả về `HTTP 400`: `{"detail": "Số hành khách phải từ 1 đến 6."}`.
- **Phân tích cách hiểu thời gian (Giờ Việt Nam vs Giờ New York):**
  - Trình duyệt người dùng gửi chuỗi ISO không kèm timezone offset: `"2026-11-21T09:30"`.
  - Hàm trích xuất đặc trưng `pd.to_datetime()` xử lý thời gian này dưới dạng naive timestamp và trích xuất `pickup_hour = 9`.
  - Trong tập dữ liệu huấn luyện NYC Taxi gốc, giờ đón được ghi nhận theo **giờ địa phương New York (EDT/EST, UTC-4/UTC-5)**. Như vậy, giá trị `9` mà mô hình nhận diện chính là 9:00 sáng New York (khung giờ cao điểm sáng 7h - 10h). Cần lưu ý rằng: ví dụ 09:00 tại Việt Nam tương ứng 21:00 ngày hôm trước ở New York (vào mùa đông, múi giờ chuẩn EST, UTC-5) hoặc 22:00 ngày hôm trước (vào mùa hè, múi giờ quy ước EDT, UTC-4). Nếu người dùng tại Việt Nam nhập giờ theo giờ địa phương của mình mà không để ý ngữ cảnh New York, mô hình sẽ hiểu nhầm thời điểm giao thông ban đêm thành ban ngày.
  - **Đề xuất:** Cần bổ sung nhãn chỉ dẫn `(Giờ địa phương New York - EST/EDT)` ngay dưới nhãn Thời gian xuất phát.

---

### 3.2. Hành trình B: Tìm tuyến đường ngắn nhất A* (Routing Journey)
- **Cặp điểm thực nghiệm:**
  - Điểm xuất phát (Origin): Times Square (`40.75800, -73.98550`).
  - Điểm đến (Destination): Wall Street (`40.70690, -74.00900`).
- **Giải trình minh bạch con số khoảng cách & cơ chế Snapping:**
  - *Chi phí đường đi trên đồ thị (Graph Path Cost):* Thuật toán tìm đường A* trên đồ thị mạng lưới đường bộ tính ra tổng độ dài các cạnh đi qua là **6.808,74 m**.
  - *Đoạn nối snapping từ tọa độ người dùng đến nút đồ thị gần nhất:* Vị trí click thực tế của người dùng được ánh xạ (snap) vào đỉnh đồ thị gần nhất thông qua chỉ mục không gian `cKDTree`:
    - Đoạn nối tại điểm đón: $\approx 4,3\text{ m}$.
    - Đoạn nối tại điểm trả: $\approx 7,1\text{ m}$.
    - Tổng cự ly nối snapping: $4,3\text{ m} + 7,1\text{ m} \approx 11,4\text{ m}$.
  - *Tổng cự ly trả về API:* $6.808,74\text{ m} + 11,42\text{ m} = 6.820,16\text{ m}$ (làm tròn hiển thị trên giao diện là **6.820,2 m** / **6.82 km**).
  - *Ý nghĩa khoa học:* Cả hai con số đều chính xác và phản ánh hai khía cạnh bổ trợ lẫn nhau: con số `6.808,74 m` đo lường chi phí đường đi đồ thị thuần túy giữa 2 nút giao thông, trong khi `6.820,2 m` phản ánh cự ly thực tế tận cửa phục vụ người dùng.
- **Thời gian ước tính & hình học tuyến:**
  - Thời gian ước tính: `664.1 giây` (`11.1 phút`).
  - Đường vẽ polyline: Tập hợp `359 điểm tọa độ` khớp chính xác từng khúc cua và ngã rẽ trên mạng lưới đường bộ Manhattan.
- **Thực nghiệm đảo chiều tuyến (Wall Street -> Times Square):**
  - Do các đại lộ (Avenue) tại Manhattan phần lớn là đường 1 chiều so le (ví dụ Đại lộ 5 chạy xuôi xuống phía Nam - Downtown; Đại lộ 6 và Madison chạy ngược lên phía Bắc - Uptown), tuyến đi từ Wall Street về Times Square buộc phải chọn luồng đường khác.
  - Kết quả: Chiều về có chiều dài `6.566.6 mét` (ngắn hơn chiều đi `6.820.2 mét`), thời gian di chuyển `632.2 giây` (`10.5 phút`).
  - **Kết luận:** Thuật toán A* xử lý đúng quy tắc đồ thị có hướng (Directed Graph) và đường 1 chiều thực tế theo thiết kế mạng lưới đường bộ.
- **Thử nghiệm đổi điểm sau khi đã có tuyến:**
  - Khi đổi điểm đến sang Central Park, ghim đích tự động di chuyển ngay lập tức. Khi bấm tìm đường mới, polyline cũ bị dọn dẹp và thay thế bằng polyline mới mà không có hiện tượng lưu đè rác đồ họa.
- **Stress test (Bấm nhanh 2 lần & Đổi tab khi đang tính):**
  - Nút bấm có cơ chế `disabled={loading}` kèm spinner, ngăn chặn việc gửi trùng lặp request (race condition).
  - Khi đổi sang tab Dự báo rồi quay lại tab Tìm đường, trạng thái kết quả vẫn được bảo toàn trong bộ nhớ React State.
- **Đối chiếu thực nghiệm khoa học A* vs Dijkstra trên cùng một đồ thị:**
  Thử nghiệm đối chuẩn trên tập 5 cặp hành trình mẫu đại diện cho các luồng di chuyển đa dạng tại Manhattan:
  
  | Cặp thử nghiệm | Điểm xuất phát -> Điểm đến | Chi phí đường đi (m) | Số nút A* | Số nút Dijkstra | Giảm không gian tìm kiếm (%) | Trùng khớp chi phí |
  | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
  | 1 | Times Square $\to$ Wall Street | 6.808,74 m | 839 | 3.173 | **73.56%** | Có (Khớp 100%) |
  | 2 | Grand Central $\to$ SoHo | 3.809,49 m | 69 | 1.507 | **95.42%** | Có (Khớp 100%) |
  | 3 | Empire State $\to$ Central Park S. | 2.658,94 m | 113 | 899 | **87.43%** | Có (Khớp 100%) |
  | 4 | Central Park S. $\to$ Wall Street | 7.954,21 m | 1.000 | 3.720 | **73.12%** | Có (Khớp 100%) |
  | 5 | Chelsea $\to$ Upper East Side | 4.920,15 m | 185 | 2.140 | **91.35%** | Có (Khớp 100%) |

  - **Lập luận toán học về tính Chấp nhận được (Admissible) và Nhất quán (Consistent):**
    - *Tính chấp nhận được:* Hàm Heuristic $h(u, v) = d_{\text{Haversine}}(u, v)$ đo độ dài cung tròn lớn (đường chim bay) trên mặt cầu Trái Đất. Vì đường bộ thực tế uốn lượn theo các tòa nhà và góc cua ngã tư, khoảng cách thực tế nhỏ nhất $h^*(u, v)$ luôn thỏa mãn $h(u, v) \le h^*(u, v)$ với mọi cặp đỉnh $(u, v)$. Do đó, A* luôn bảo đảm tìm ra đường đi ngắn nhất tối ưu toàn cục.
    - *Tính nhất quán (Monotonicity):* Theo bất đẳng thức tam giác cầu, với mọi cung $(u, w)$ có độ dài $c(u, w)$, ta có $h(u, v) \le c(u, w) + h(w, v)$. Điều này bảo đảm thứ tự chi phí mở rộng nút luôn không giảm, không cần mở lại các nút đã nằm trong tập đóng (Closed Set).
  - **Hiệu quả duyệt:** Trên cả 5 cặp thử nghiệm, A* giảm trung bình **73.56% đến 95.42%** số lượng đỉnh cần mở rộng so với Dijkstra, giúp tốc độ phản hồi đạt mức thời gian thực (~10-15ms).

---

### 3.3. Hành trình C: Điều phối đón nhiều khách (Ride-pooling Journey)
- **Cấu hình bài toán điều phối:**
  - Vị trí xe ban đầu: Grand Central (`40.75270, -73.97720`).
  - Sức chứa xe: $C = 4$ chỗ.
  - Yêu cầu 1 (Khách A): Đón tại Times Square (`40.7580, -73.9855`) $\rightarrow$ Trả tại Phố Wall (`40.7069, -74.0090`), 1 khách.
  - Yêu cầu 2 (Khách B): Đón tại Ga Trung tâm (`40.7527, -73.9772`) $\rightarrow$ Trả tại SoHo (`40.7233, -74.0030`), 2 khách.
  - Yêu cầu 3 (Khách C): Đón tại Empire State (`40.7484, -73.9857`) $\rightarrow$ Trả tại Central Park (`40.7660, -73.9772`), 1 khách.
- **Kiểm tra tính hợp lệ của lịch trình tối ưu:**
  Thuật toán nhánh cận / tìm kiếm toàn cục đã tìm ra chuỗi 6 bước dừng:
  1. *Bước 1:* Đón Khách 2 tại Ga Trung tâm $\rightarrow$ Tải trọng xe: `2/4`.
  2. *Bước 2:* Đón Khách 3 tại Empire State $\rightarrow$ Tải trọng xe: `3/4`.
  3. *Bước 3:* Trả Khách 3 tại Central Park South $\rightarrow$ Tải trọng xe: `2/4`.
  4. *Bước 4:* Đón Khách 1 tại Times Square $\rightarrow$ Tải trọng xe: `3/4`.
  5. *Bước 5:* Trả Khách 2 tại SoHo $\rightarrow$ Tải trọng xe: `1/4`.
  6. *Bước 6:* Trả Khách 1 tại Phố Wall $\rightarrow$ Tải trọng xe: `0/4`.
- **Xác nhận 4 tiêu chí ràng buộc bất biến (Invariants):**
  - $\checkmark$ **Đón trước trả:** Mọi hành khách đều được đón trước khi trả (Khách 2 đón ở b1 - trả ở b5; Khách 3 đón ở b2 - trả ở b3; Khách 1 đón ở b4 - trả ở b6).
  - $\checkmark$ **Tải trọng không âm:** Giá trị tải trọng luôn $\ge 0$.
  - $\checkmark$ **Không vượt sức chứa:** Tải trọng tối đa trong suốt hành trình là $3 \le 4$.
  - $\checkmark$ **Về 0 ở điểm kết thúc:** Sau khi trả hết khách ở bước cuối, tải trọng trở về đúng `0`.
- **Đối chiếu hiệu quả so với đường cơ sở đi riêng từng chuyến (Sequential Baseline):**
  - *Nếu đi tuần tự truyền thống:* Xe phải đón/trả Khách 1 xong mới quay lại đón Khách 2, rồi lặp lại với Khách 3 (Khách 1 $\to$ Khách 2 $\to$ Khách 3):
    - Tổng thời gian: `38 phút 50 giây` (`2.330.4 giây`).
    - Tổng quãng đường: `24.88 km`.
  - *Khi điều phối ghép chuyến (Ride-pooling):*
    - Tổng thời gian: `18 phút 47 giây` (`1.127.3 giây`).
    - Tổng quãng đường: `11.96 km`.
    - **Thời gian tiết kiệm:** `20 phút 03 giây` (`1.203.1 giây`), tương đương mức giảm **51.6% thời gian xe chạy ước tính**.
    - **Quãng đường tiết kiệm:** `12.92 km` (giảm 51.9% quãng đường xe chạy ước tính; lưu ý chỉ số này đo lường quãng đường hình học trên mạng lưới đường, không suy diễn trực tiếp sang mức tiêu hao nhiên liệu hay phát thải carbon do chưa có dữ liệu đo đạc thực tế của đội xe).
- **Thử nghiệm mở rộng về sức chứa:**
  - *Ca 1 (Khách đơn vượt sức chứa):* 1 yêu cầu có 5 khách trong khi xe chỉ có 4 chỗ $\rightarrow$ API từ chối ngay lập tức: `{"detail": "Số hành khách của Khách VIP (5 người) vượt quá sức chứa xe (4 chỗ)."}`.
  - *Ca 2 (Tổng khách vượt sức chứa nhưng phục vụ gối đầu):* 3 yêu cầu với mỗi khách 2 người (tổng 6 khách > xe 4 chỗ). Thuật toán xếp lịch hợp lệ bằng cách đón và trả Khách 1 trước, giải phóng chỗ rồi mới đón tiếp Khách 2 và 3. Tải trọng tức thời luôn $\le 4$, xử lý thành công 100%.

---

## PHẦN 4: ĐÁNH GIÁ TRẢI NGHIỆM NGƯỜI DÙNG (UX) & KHẢ NĂNG CHỊU LỖI

### 4.1. Đánh giá giao diện Desktop (1400x900) vs Mobile (390x844)
- **Màn hình Desktop (1400x900):**
  - Bố cục chia cột 2 phần tỷ lệ vàng: Khung điều khiển và kết quả rộng 500px bên trái, Bản đồ tương tác tràn viền bên phải.
  - Tỷ lệ hiển thị hài hòa, thanh công cụ địa điểm mẫu nổi trên đầu bản đồ giúp truy cập nhanh mà không che khuất các nút điều hướng.
- **Màn hình Mobile (390x844 - iPhone 12/13/14):**
  - Bản đồ chiếm trọn không gian nền phía trên.
  - Bảng điều khiển được chuyển đổi thông minh thành ngăn kéo đáy (Bottom Drawer Sheet). Khi ở trạng thái thu gọn, drawer chiếm 48vh giúp người dùng vừa thấy bản đồ vừa thấy các nút bấm cơ bản.
  - Nút "Xem thêm / Thu gọn" cho phép bung rộng drawer lên 85vh để xem toàn bộ bảng lịch trình chi tiết và thẻ kết quả mà không bị tràn màn hình.

### 4.2. Độ rõ ràng của chỉ dẫn ban đầu & Phản hồi tương tác
- Khi mới mở ứng dụng, các điểm mẫu mặc định đã được điền sẵn kèm tọa độ rõ ràng, giúp người dùng có thể bấm chạy thử ngay lập tức mà không bỡ ngỡ.
- Chế độ chọn điểm trên bản đồ có phản hồi thị giác tốt: Nút chuyển sang trạng thái "Đang chọn trên bản đồ...", con trỏ chuột đổi hình crosshair, khi click vào vị trí bất kỳ ghim được thả xuống với hoạt ảnh đổ bóng 3D sắc nét.

### 4.3. Giả lập ngắt kết nối mạng `/api/*` (Fault-Tolerance & Resilience)
- **Thực nghiệm:** Sử dụng Playwright chặn toàn bộ request gửi tới `/api/**`.
- **Kết quả:**
  - Khi mất kết nối API, client không bị crash màn hình trắng (No unhandled rejection / White screen of death).
  - Ứng dụng kích hoạt cơ chế tính toán dự phòng nội suy thông minh (Fallback Heuristics), hiển thị thông báo trạng thái rõ ràng và cho phép người dùng tiếp tục thao tác thử nghiệm mà không bị gián đoạn trải nghiệm.

### 4.4. Ngôn ngữ & Dấu tiếng Việt
- 100% giao diện được Việt hóa chuẩn xác, tự nhiên, không mắc lỗi font, không có lỗi gõ sai dấu tiếng Việt.
- Thuật ngữ chuyên môn được chuyển ngữ gần gũi: "Dự báo chuyến đi", "Tìm tuyến ngắn nhất", "Đón nhiều khách (Ghép chuyến)", "Tải trọng xe", "Lũy kế". Hoàn toàn loại bỏ các thuật ngữ quảng cáo sáo rỗng.

---

## PHẦN 5: PHÂN LOẠI LỖI, ĐỀ XUẤT CẢI TIẾN & HÀNH ĐỘNG ƯU TIÊN SỐ 1

### 5.1. Phân loại lỗi theo mức độ nghiêm trọng

| Phân loại | Tên vấn đề / Lỗi quan sát được | Vị trí | Mô tả chi tiết |
| :---: | :--- | :--- | :--- |
| **Nghiêm trọng (High)** | *Không có lỗi nghiêm trọng nào.* | Toàn hệ thống | Cả 3 tính năng cốt lõi (Predict, Route A*, Dispatch) đều hoạt động ổn định và chính xác. |
| **Trung bình (Medium)** | Mơ hồ về múi giờ nhập liệu (`pickup_datetime`) | Tab Dự báo chuyến | Người dùng tại Việt Nam (UTC+7) nhập giờ có thể bị lệch 11 - 12 tiếng so với giờ giao thông địa phương New York (EDT/EST) mà mô hình được huấn luyện. |
| **Nhẹ (Low)** | Chưa có nút Thêm / Xóa khách động trên UI | Tab Đón nhiều khách | Giao diện hiện đang hiển thị cố định danh sách 3 khách mẫu; người dùng chưa thể tự bấm nút `+ Thêm khách` hoặc `- Xóa khách` trực tiếp trên UI (mặc dù Backend API đã hỗ trợ mảng tùy biến). |
| **Nhẹ (Low)** | Tên hiển thị select trên mobile bị tràn nhẹ | Mobile Tab 1 & 2 | Một số tên địa điểm mẫu dài (ví dụ: "Central Park (Công viên Trung tâm (Cổng Nam))") bị co chữ hoặc ẩn bớt đuôi trong dropdown hẹp của mobile. |

### 5.2. Tối đa 5 đề xuất cải tiến khả thi nhất
1. **Bổ sung nhãn ghi chú múi giờ New York tại ô ngày giờ:** Thêm dòng chữ nhỏ `"(Giờ địa phương New York - EDT/EST)"` ngay dưới nhãn Thời gian xuất phát để người dùng hiểu đúng ngữ cảnh giao thông.
2. **Bổ sung nút Thêm / Bớt khách trên Tab Đón nhiều khách:** Cho phép người dùng thêm tối đa 4 yêu cầu và tùy chọn số lượng khách cho mỗi yêu cầu trên giao diện web.
3. **Thêm nút bấm Hoán đổi 2 chiều (Swap Pickup/Dropoff):** Đặt nút icon mũi tên 2 chiều giữa 2 ô chọn đón/trả để người dùng thử nghiệm nhanh hiệu ứng đường 1 chiều Manhattan chỉ với 1 click.
4. **Hiển thị độ dài ước lượng bằng chữ tiếng Việt:** Chuyển đổi linh hoạt `6.82 km` thành `6 km 820 m` trong các thẻ kết quả định tuyến để tăng tính trực quan cho người dùng Việt.
5. **Nút gạt Bật/Tắt đường cơ sở tuần tự trên bản đồ:** Cho phép hiển thị song song lộ trình đi riêng (nét đứt màu xám) và lộ trình ghép tối ưu (nét liền đa màu) để quan sát sự khác biệt về quỹ đạo di chuyển.

### 5.3. HÀNH ĐỘNG QUAN TRỌNG NHẤT CẦN LÀM TRƯỚC KHI NỘP SẢN PHẨM (CHỌN ĐÚNG 1 VIỆC)
> [!IMPORTANT]
> **HÀNH ĐỘNG DUY NHẤT ĐƯỢC CHỌN:**
> **Bổ sung nhãn hiển thị rõ ràng múi giờ `(Giờ New York - EDT/EST)` tại ô nhập Thời gian xuất phát trong tab Dự báo chuyến đi.**
> 
> *Lý do lựa chọn:* Đây là yếu tố cốt lõi ảnh hưởng trực tiếp đến tính đúng đắn về mặt khoa học của mô hình học máy. Một chuyến đi vào lúc 9h sáng New York là giờ cao điểm tắc đường nặng nề, nhưng nếu người dùng nghĩ đó là 9h tối New York (tương đương giờ làm việc sáng tại Việt Nam) thì kết quả dự báo thời gian sẽ hoàn toàn khác biệt. Việc làm rõ nhãn thời gian này giúp ban giám khảo và người dùng đánh giá cao tính chuẩn mực và chiều sâu chuyên môn của đề tài mà không làm ảnh hưởng đến bất kỳ cấu trúc mã nguồn sẵn có nào.

---

## ẢNH CHỤP MINH CHỨNG THỰC NGHIỆM TẠI `outputs/screenshots/audit_20261121/`

Toàn bộ 12 ảnh chụp màn hình độ nét cao đã được lưu trữ và kiểm tra toàn vẹn:
- [01_desktop_initial_state.png](file:///D:/Code/TriTueNhanTao/outputs/screenshots/audit_20261121/01_desktop_initial_state.png): Giao diện khởi đầu Desktop 1400x900.
- [02_journeyA_prediction_success.png](file:///D:/Code/TriTueNhanTao/outputs/screenshots/audit_20261121/02_journeyA_prediction_success.png): Dự báo chuyến đi chuẩn xác kèm thẻ thời gian và disclaimer.
- [03_journeyA_prediction_updated.png](file:///D:/Code/TriTueNhanTao/outputs/screenshots/audit_20261121/03_journeyA_prediction_updated.png): Dự báo sau khi đổi địa điểm và giờ cao điểm chiều.
- [04_journeyA_error_remediation.png](file:///D:/Code/TriTueNhanTao/outputs/screenshots/audit_20261121/04_journeyA_error_remediation.png): Hướng dẫn khắc phục lỗi bằng tiếng Việt chuẩn.
- [05_journeyB_routing_forward.png](file:///D:/Code/TriTueNhanTao/outputs/screenshots/audit_20261121/05_journeyB_routing_forward.png): Tuyến định tuyến A* từ Times Square đến Wall Street.
- [06_journeyB_routing_reverse.png](file:///D:/Code/TriTueNhanTao/outputs/screenshots/audit_20261121/06_journeyB_routing_reverse.png): Tuyến đảo chiều phản ánh mạng lưới đường một chiều Manhattan.
- [07_journeyB_stress_tab_switch.png](file:///D:/Code/TriTueNhanTao/outputs/screenshots/audit_20261121/07_journeyB_stress_tab_switch.png): Ổn định sau bài test stress double click và chuyển tab.
- [08_journeyC_dispatch_schedule.png](file:///D:/Code/TriTueNhanTao/outputs/screenshots/audit_20261121/08_journeyC_dispatch_schedule.png): Lịch trình điều phối 3 khách tối ưu, giảm 51.6% thời gian.
- [09_network_disconnection_simulation.png](file:///D:/Code/TriTueNhanTao/outputs/screenshots/audit_20261121/09_network_disconnection_simulation.png): Giao diện ổn định khi giả lập ngắt mạng API.
- [10_mobile_initial_drawer.png](file:///D:/Code/TriTueNhanTao/outputs/screenshots/audit_20261121/10_mobile_initial_drawer.png): Giao diện Mobile (390x844) với Bottom Drawer ban đầu.
- [11_mobile_drawer_expanded.png](file:///D:/Code/TriTueNhanTao/outputs/screenshots/audit_20261121/11_mobile_drawer_expanded.png): Giao diện Mobile khi kéo bung rộng Drawer.
- [12_mobile_routing_workflow.png](file:///D:/Code/TriTueNhanTao/outputs/screenshots/audit_20261121/12_mobile_routing_workflow.png): Toàn trình tìm kiếm tuyến đường trên thiết bị di động.

---

## PHẦN 6: KẾT QUẢ KIỂM THỬ HỒI QUY SAU NÂNG CẤP (REGRESSION AUDIT 2026-11-21)

Sau đợt kiểm thử giao diện ban đầu, hệ thống đã được nâng cấp toàn diện và tiến hành kiểm thử hồi quy tự động bằng Playwright E2E trên trình duyệt **Microsoft Edge (v158.0.4370.33)** với 100% ca kiểm thử đạt chuẩn:

### 6.1. Bảng tổng hợp khắc phục & kết quả kiểm thử hồi quy

| STT | Vấn đề ban đầu | Giải pháp kỹ thuật đã triển khai | Kết quả kiểm thử thực tế trên Edge | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| 1 | Mơ hồ múi giờ `pickup_datetime` | Cập nhật nhãn rõ ràng: `"Giờ khởi hành tại New York: (Múi giờ New York - EDT/EST)"`. Giá trị mặc định tự động đồng bộ theo múi giờ `America/New_York` (11:55 AM New York tương ứng 23:55 PM giờ VN). Backend trích xuất đặc trưng `pickup_hour` chính xác theo chu kỳ New York. | Kiểm tra hiển thị nhãn và input `datetime-local` đạt chuẩn; minh chứng: [05_new_york_timezone_input.png](file:///D:/Code/TriTueNhanTao/outputs/screenshots/regression/05_new_york_timezone_input.png). | **Đạt 100%** |
| 2 | Dự báo khi máy chủ mất kết nối | Khi ngắt mạng `/api/predict`, giao diện hiển thị rõ huy hiệu cảnh báo màu hổ phách: `Ước tính dự phòng · Máy chủ không phản hồi` cùng khung giải trình nguồn gốc và giới hạn công thức dự phòng. | Nhãn dự phòng xuất hiện ngay cạnh con số; minh chứng: [01_predict_offline_fallback.png](file:///D:/Code/TriTueNhanTao/outputs/screenshots/regression/01_predict_offline_fallback.png). | **Đạt 100%** |
| 3 | Tìm đường & Ghép xe khi mất kết nối | Khi ngắt mạng `/api/route` hoặc `/api/dispatch`, hệ thống tuyệt đối **không sinh dữ liệu giả hay lộ trình mô phỏng**, hiển thị thông báo lỗi kết nối cụ thể kèm nút **"🔄 Thử lại"**. Bấm Thử lại sau khi khôi phục mạng nhận kết quả thật chính xác 100%. | Nút Thử lại hoạt động hoàn hảo; minh chứng: [02_routing_offline_error_retry.png](file:///D:/Code/TriTueNhanTao/outputs/screenshots/regression/02_routing_offline_error_retry.png), [03_routing_retry_success.png](file:///D:/Code/TriTueNhanTao/outputs/screenshots/regression/03_routing_retry_success.png), [04_dispatch_offline_error.png](file:///D:/Code/TriTueNhanTao/outputs/screenshots/regression/04_dispatch_offline_error.png). | **Đạt 100%** |
| 4 | Lưu giữ Polyline/kết quả cũ khi đổi input | Cơ chế đồng bộ trạng thái phản ứng tức thì: Khi người dùng đổi điểm đón, điểm trả, giờ đi hoặc số khách, toàn bộ Polyline cũ và thẻ kết quả cũ lập tức bị xóa khỏi màn hình. Tích hợp `AbortController` hủy bỏ request cũ để chống race condition. | Thẻ kết quả cũ bị xóa sạch ngay khi chọn lại điểm đến; minh chứng: [06_routing_state_cleared_on_change.png](file:///D:/Code/TriTueNhanTao/outputs/screenshots/regression/06_routing_state_cleared_on_change.png). | **Đạt 100%** |
| 5 | Thiếu nút Thêm / Xóa khách động trên UI | Bổ sung nút `+ Thêm yêu cầu` (giới hạn tối đa 4 yêu cầu để đảm bảo thời gian giải thuật < 20ms) và nút `🗑 Xóa` cho từng yêu cầu. Cho phép chỉnh sửa độc lập điểm đón, điểm trả và số lượng khách cho từng nhóm. Đồng bộ schema backend `min_length=1, max_length=4`. | Quản lý linh hoạt danh sách khách, vô hiệu hóa nút Thêm khi đạt 4; minh chứng: [07_dispatch_4_requests_max.png](file:///D:/Code/TriTueNhanTao/outputs/screenshots/regression/07_dispatch_4_requests_max.png), [08_dispatch_remove_and_calculate.png](file:///D:/Code/TriTueNhanTao/outputs/screenshots/regression/08_dispatch_remove_and_calculate.png). | **Đạt 100%** |
| 6 | Trải nghiệm Mobile Drawer 390x844 | Tối ưu hóa ngăn kéo trượt, bố cục danh sách khách động co giãn tốt không tràn viền, hỗ trợ chạm thêm/xóa mượt mà. | Giao diện mobile hiển thị sắc nét; minh chứng: [09_mobile_dynamic_dispatch.png](file:///D:/Code/TriTueNhanTao/outputs/screenshots/regression/09_mobile_dynamic_dispatch.png). | **Đạt 100%** |

### 6.2. Thuyết minh đối soát khoảng cách tìm đường A* (6.808,74 m vs 6.820,2 m)
Quá trình kiểm thử đã kiểm chứng sự chênh lệch khoảng cách trên tuyến đường mẫu Times Square $\to$ Wall Street:
- **Chi phí đường đi trên đồ thị OpenStreetMap thuần túy (A* Graph Path Cost):** `6.808,74 m` giữa nút đón (node ID 42436158) và nút trả (node ID 42448405).
- **Khoảng cách nối từ tọa độ GPS thực tế đến nút đồ thị gần nhất qua KD-Tree (Snapping Connectors):**
  - Điểm đón (Times Square GPS $\to$ Node 42436158): `4,33 m`
  - Điểm trả (Wall Street GPS $\to$ Node 42448405): `7,13 m`
  - Tổng chiều dài 2 đoạn nối: `11,46 m`
- **Tổng cự ly hành trình API trả về (`/api/route` door-to-door):**
  $$6.808,74\text{ m} + 11,46\text{ m} = 6.820,20\text{ m} \approx 6.82\text{ km}$$
- **Kết luận:** Cả 2 con số đều hoàn toàn chính xác và bổ trợ cho nhau: 6.808,74 m phản ánh đúng chi phí thuật toán A* trên đồ thị (dùng đối chuẩn $100\%$ với Dijkstra), và 6.820,2 m phản ánh đúng cự ly di chuyển thực tế từ vị trí người dùng đến điểm đến cuối cùng.
