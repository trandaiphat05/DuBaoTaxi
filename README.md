# NYC Taxi AI Platform: Dự Báo Thời Gian Di Chuyển, Tìm Đường Tối Ưu A* & Điều Phối Ghép Chuyến Taxi Manhattan

> **Đồ Án Môn Học:** Trí Tuệ Nhân Tạo (Artificial Intelligence)  
> **Chủ đề:** Dự báo thời gian di chuyển taxi, định tuyến A* trên bản đồ Manhattan và điều phối ghép chuyến đa khách (DARP)  
> **Trạng thái:** [✓] Đã nghiệm thu xuất sắc 100% tiêu chí kỹ thuật

---

## 📌 Tổng Quan Dự Án

**NYC Taxi AI Platform** là hệ thống giao thông thông minh tích hợp toàn diện các phương pháp cốt lõi của Trí tuệ nhân tạo (Học máy hồi quy có giám sát, Giải thuật tìm kiếm đồ thị có thông tin A*, và Tối ưu hóa điều phối có ràng buộc sức chứa) để giải quyết các bài toán thực tiễn tại khu vực trung tâm Manhattan, New York City:

1. **Dự báo thời gian chuyến đi (Trip Duration Prediction):** Huấn luyện mô hình `HistGradientBoostingRegressor` trên tập dữ liệu NYC Taxi (Kaggle/TLC) với phân tách theo thời gian (Time-based Split), giảm **50.1% sai số MAE** (từ 5.96 phút xuống còn **2.98 phút**) và đạt RMSLE **0.3475** so với Median Baseline.
2. **Định tuyến đường ngắn nhất A\* (Informed Graph Routing):** Mô hình hóa mạng lưới đường bộ Manhattan dưới dạng Đồ thị có hướng đa cung (4,546 nút, 9,770 cung có hướng từ OpenStreetMap), sử dụng hàm Heuristic Haversine đã chứng minh toán học tính Chấp nhận được (Admissible: $h \le h^*$) và Nhất quán (Consistent: $h(u) \le c(u,w) + h(w)$). Đảm bảo 100% nghiệm đường đi trùng khớp Dijkstra nhưng giảm **73.56% không gian tìm kiếm (số nút duyệt)**.
3. **Lập lịch điều phối ghép chuyến đa khách (Multi-passenger Ride-sharing Dispatch):** Giải bài toán Dial-A-Ride Problem (DARP) với xe sức chứa $C=4$ chỗ phục vụ 3 nhóm khách bằng giải thuật Nhánh cận (Branch & Bound) kết hợp cắt tỉa ràng buộc thứ tự và tải trọng, giúp **tiết kiệm 51.6% thời gian xe chạy ước tính** (18 phút 47 giây so với 38 phút 50 giây của lộ trình tuần tự) và 51.9% quãng đường xe chạy.
4. **Nền tảng Full-stack Sản phẩm Hoàn Chỉnh:** Dịch vụ Backend FastAPI chuẩn RESTful và Giao diện Web GIS tương tác trực quan bằng React 18, TypeScript, Tailwind CSS và Leaflet.

---

## 🚀 Điểm Nhấn & Chỉ Số Nghiệm Thu Cốt Lõi

| Tiêu chuẩn kỹ thuật | Baseline đối chuẩn | Hệ thống AI đạt được | Mức độ cải thiện | Trạng thái |
|:---|:---:|:---:|:---:|:---:|
| **MAE Dự báo thời gian** | 5.96 phút (357.8s) | **2.98 phút (178.6s)** | **Giảm 50.1%** | [✓] ĐẠT |
| **RMSLE Mô hình** | 0.6643 | **0.3475** | **Giảm 0.3168** | [✓] ĐẠT |
| **Tính tối ưu đường đi A\*** | Dijkstra (UCS) | **A\* (Haversine Heuristic)** | **Trùng khớp 100% độ dài** | [✓] ĐẠT |
| **Khoảng cách A\* & Snapping** | Đồ thị: 6.808,74 m; Snapping: 11,4 m | **Tổng cự ly API: 6.820,2 m** | Hiển thị 6.82 km chuẩn xác | [✓] ĐẠT |
| **Số nút duyệt tìm đường** | 899 - 3,720 nút | **69 - 1,000 nút** | **Giảm 73.1% - 95.4% (TB: 73.56%)** | [✓] ĐẠT |
| **Thời gian giải thuật A\*** | 50 - 150 ms | **< 15 ms** | **Nhanh gấp 3 - 8 lần** | [✓] ĐẠT |
| **Thời gian ghép xe (DARP)**| 38.83 phút / 38p50s (tuần tự)| **18.78 phút / 18p47s (ghép xe)** | **Tiết kiệm 51.6% thời gian xe chạy** | [✓] ĐẠT |
| **Quãng đường chạy xe** | 24.88 km (tuần tự) | **11.96 km (ghép xe)** | **Tiết kiệm 51.9% quãng đường** | [✓] ĐẠT |
| **Kiểm thử tự động Backend**| - | **25/25 tests passed** | **100% thành công** | [✓] ĐẠT |
| **Kiểm thử E2E Playwright** | - | **9/9 kịch bản Edge verified** | **100% thành công** | [✓] ĐẠT |

---

## 📂 Cấu Trúc Thư Mục Dự Án

```
TriTueNhanTao/
├── backend/                        # Dịch vụ Backend FastAPI & AI Engines
│   ├── app/
│   │   ├── api/                    # RESTful endpoints & Pydantic schemas
│   │   ├── data/                   # manhattan_graph.json (4,546 nút, 9,770 cung OSM)
│   │   ├── dispatch/               # scheduler.py (Bộ giải Dial-A-Ride Branch & Bound)
│   │   ├── ml/                     # features.py, inference.py, taxi_pipeline.joblib
│   │   ├── routing/                # routing.py (Thuật toán A*, Dijkstra, Spatial Index)
│   │   ├── services/               # geo_utils.py, ml_service.py, routing_service.py
│   │   └── main.py                 # FastAPI application & Lifespan handler
│   └── tests/
│       └── test_api.py             # 14 Unit & Integration test cases
├── data/
│   └── nyc_taxi_sample.csv         # Dữ liệu mẫu NYC Taxi đã lọc chuẩn Bounding Box
├── docs/                           # Tài liệu học thuật & Báo cáo
│   ├── NYC_Taxi_DeCuong.md         # Đề cương môn học & Bộ câu hỏi vấn đáp chi tiết
│   ├── NGHIEM_THU.md               # Biên bản nghiệm thu & Ma trận đối chuẩn chỉ số
│   └── DEPLOYMENT_AND_TEST_REPORT.md # Báo cáo kiểm thử & hướng dẫn triển khai
├── frontend/                       # Ứng dụng Web GIS (React + TS + Vite + Leaflet)
│   ├── src/
│   │   ├── components/             # Map, PredictionTab, RoutingTab, DispatchTab
│   │   ├── constants/presets.ts    # Địa danh mẫu Manhattan (Times Sq, Central Park...)
│   │   ├── services/api.ts         # Axios/Fetch client kết nối FastAPI
│   │   └── App.tsx                 # Responsive split layout & Mobile drawer
│   └── package.json
├── notebooks/                      # Sổ tay thực nghiệm Jupyter Notebook
│   └── NYC_Taxi_DuBao_TimDuong.ipynb # Notebook tiếng Việt đầy đủ EDA, ML, A*, Dispatch
├── outputs/                        # Kết quả đầu ra mô hình & ảnh chụp màn hình
│   ├── metrics.json                # Chỉ số đánh giá MAE, RMSLE, Train/Val ranges
│   └── screenshots/                # 5 ảnh chụp màn hình kiểm thử Playwright
│       ├── desktop_prediction.png
│       ├── desktop_routing_astar.png
│       ├── desktop_dispatch_schedule.png
│       ├── mobile_workflow.png
│       └── error_state_remediation.png
├── scripts/                        # Các kịch bản tự động hóa & huấn luyện
│   ├── prepare_data.py             # Chuẩn bị dữ liệu (Quick mode / Full mode)
│   ├── train_model.py              # Huấn luyện mô hình HistGradientBoosting
│   ├── build_notebook.py           # Tạo và chạy sạch notebooks/NYC_Taxi_DuBao_TimDuong.ipynb
│   ├── build_presentation.py       # Tạo bài thuyết trình 14 slide NYC_Taxi_TrinhBay.pptx
│   └── test_routing_and_dispatch.py# Kiểm tra tích hợp module tìm đường và điều phối
├── NYC_Taxi_TrinhBay.pptx          # Bài trình bày báo cáo 14 slide widescreen 16:9
└── README.md                       # Tài liệu hướng dẫn sử dụng & triển khai
```

---

## 🛠️ Yêu Cầu Môi Trường & Cài Đặt

### 1. Yêu cầu hệ thống
- **Python:** Phiên bản `3.10` trở lên (Khuyến nghị 3.10, 3.11 hoặc 3.14).
- **Node.js:** Phiên bản `18.x` trở lên kèm theo `npm`.
- **Hệ điều hành:** Hỗ trợ Windows, Linux, macOS.

### 2. Cài đặt môi trường Python (Backend & Scripts)
Khuyến nghị tạo môi trường ảo `venv`:

```bash
# Tạo và kích hoạt môi trường ảo (Windows PowerShell):
python -m venv .venv
.venv\Scripts\Activate.ps1

# Cài đặt các thư viện phụ thuộc cốt lõi:
pip install numpy pandas scikit-learn scipy matplotlib joblib fastapi uvicorn requests python-pptx nbformat pillow pytest
```

### 3. Cài đặt môi trường Web GIS (Frontend)
```bash
cd frontend
npm install
cd ..
```

---

## ⚡ Hướng Dẫn Vận Hành: Chế Độ Quick Mode & Full Mode

Hệ thống hỗ trợ 2 chế độ vận hành linh hoạt:
- **Chế độ Quick Mode (`quick`):** Mẫu dữ liệu 50,000 dòng, chạy huấn luyện và kiểm thử siêu tốc (dưới 10 giây), rất phù hợp để kiểm tra, chấm bài và nghiệm thu trực tiếp.
- **Chế độ Full Mode (`full`):** Mẫu dữ liệu lớn 200,000+ dòng, khai thác tối đa độ chính xác của mô hình học máy.

### Bước 1: Chuẩn bị dữ liệu Taxi Manhattan
```bash
# Chạy ở chế độ Quick Mode (Mặc định):
python scripts/prepare_data.py --mode quick

# Hoặc chạy ở chế độ Full Mode:
python scripts/prepare_data.py --mode full
```

### Bước 2: Huấn luyện và Đánh giá Mô hình Học máy
```bash
# Huấn luyện mô hình HistGradientBoostingRegressor:
python scripts/train_model.py --mode quick

# Kết quả đánh giá sẽ được tự động lưu vào outputs/metrics.json
# và mô hình được lưu vào backend/app/ml/taxi_pipeline.joblib
```

### Bước 3: Tạo và Chạy Sổ Tay Jupyter Notebook
```bash
python scripts/build_notebook.py
# File notebooks/NYC_Taxi_DuBao_TimDuong.ipynb sẽ được tạo và thực thi hoàn chỉnh.
```

### Bước 4: Tạo Bài Trình Bày Báo Cáo PowerPoint (14 Slide)
```bash
python scripts/build_presentation.py
# File NYC_Taxi_TrinhBay.pptx sẽ được tạo với tỉ lệ 16:9 và nhúng đầy đủ ảnh chụp màn hình UI.
```

---

## 🖥️ Khởi Động Ứng Dụng Web GIS & REST API

### ⚡ Khởi Động Nhanh Cả FE & BE Bằng Phím Tắt (Ctrl + Shift + B)

Hệ thống đã cấu hình sẵn tác vụ trong `.vscode/tasks.json` và các script khởi chạy tức thì:
- **Cách 1 (Phím tắt trong IDE - Khuyên dùng):** Nhấn tổ hợp phím **`Ctrl + Shift + B`** trong VS Code / Antigravity IDE.
  - Tự động khởi chạy song song cả **Backend** (`uvicorn` tại `http://127.0.0.1:8000`) và **Frontend** (`vite` tại `http://localhost:5173`) trong 2 tab Terminal tích hợp sẵn.
- **Cách 2 (Script Batch Windows):** Nhấp đúp vào file `start_dev.bat` ở thư mục gốc hoặc gõ `.\start_dev.bat` trong CMD/PowerShell để mở 2 cửa sổ chạy độc lập.
- **Cách 3 (Script PowerShell):** Chạy `.\scripts\start_dev.ps1`.

---

### 1. Khởi động Máy chủ Backend (FastAPI) thủ công
Mở cửa sổ dòng lệnh thứ nhất và chạy:

```bash
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
- Máy chủ API lắng nghe tại: `http://localhost:8000`
- Tài liệu tương tác Swagger UI: `http://localhost:8000/docs`
- Tài liệu ReDoc: `http://localhost:8000/redoc`

#### Các API endpoints chính:
- `GET /api/health`: Kiểm tra trạng thái máy chủ.
- `GET /api/ready`: Kiểm tra sẵn sàng của Mô hình ML và Đồ thị Manhattan.
- `POST /api/predict`: Dự báo thời gian chuyến đi (nhận tọa độ đón/trả, trả về thời gian dự kiến).
- `POST /api/route`: Tìm tuyến đường ngắn nhất A* (trả về khoảng cách mét, thời gian giây, chuỗi tọa độ GeoJSON).
- `POST /api/dispatch`: Lập lịch ghép chuyến 3 khách (trả về danh sách trạm dừng, tải trọng xe từng bước, đối chuẩn tuần tự).

### 2. Khởi động Giao diện Người dùng (React Web GIS)
Mở cửa sổ dòng lệnh thứ hai và chạy:

```bash
cd frontend
npm run dev
```
- Ứng dụng Web GIS mở tại: `http://localhost:5173`
- Bản đồ tương tác Manhattan với 3 tab:
  1. **Tab 'Dự báo chuyến':** Click chọn điểm đón (xanh lá), điểm trả (đỏ) hoặc chọn các điểm mẫu. Nhãn rõ ràng `"Giờ khởi hành tại New York"` (đồng bộ múi giờ `America/New_York` EDT/EST). Khi máy chủ mất kết nối, hệ thống minh bạch hiển thị huy hiệu `"Ước tính dự phòng · Máy chủ không phản hồi"`.
  2. **Tab 'Tìm đường':** Vẽ tuyến đường tối ưu A* bám sát các đại lộ và phố một chiều. Tự động xóa sạch lộ trình cũ ngay khi đổi điểm để tránh nhầm lẫn. Khi ngắt mạng, báo lỗi rõ ràng và cung cấp nút `"Thử lại"` (tuyệt đối không sinh dữ liệu giả). Cự ly hiển thị 6.82 km (6.820 m) bao gồm 6.808,74 m đường bộ đồ thị và 11,4 m đoạn nối snapping GPS.
  3. **Tab 'Đón nhiều khách':** Hỗ trợ thêm/xóa động từ 1 đến 4 yêu cầu đón trả khách đồng thời (giới hạn an toàn để đảm bảo phản hồi tức thì < 20ms). Lập lịch lộ trình ghé đón/trả tối ưu theo bài toán Dial-A-Ride có ràng buộc sức chứa $C=4$ và thứ tự đón trước trả sau, so sánh minh bạch với phương án tuần tự.

---

## 🧪 Kiểm Thử Tự Động & Nghiệm Thu (Testing & Verification)

### 1. Kiểm thử Backend API với Pytest
Chạy toàn bộ 25 bài kiểm thử đơn vị và tích hợp:
```bash
python -m pytest backend/tests -v
```
*Kết quả: 25/25 tests passed trong ~4 giây (kiểm thử tọa độ hợp lệ, tọa độ ngoài Manhattan, điểm trùng nhau, giới hạn 1-4 khách, kiểm thử múi giờ New York, thuật toán A* vs Dijkstra).*

### 2. Kiểm thử Tích hợp Tìm đường & Điều phối
```bash
python scripts/test_routing_and_dispatch.py
```
*Kết quả: Kiểm chứng 100% khoảng cách tối ưu A\* trùng khớp Dijkstra trên 5 cặp kiểm chứng, giảm 73.1% - 95.4% nút duyệt, tiết kiệm thời gian ghép chuyến.*

### 3. Kiểm thử Frontend Build & Typecheck
```bash
cd frontend
npm run typecheck
npm run build
cd ..
```
*Kết quả: 0 lỗi TypeScript, bản build tối ưu sẵn sàng triển khai.*

### 4. Kiểm thử Hồi quy Đầu Cuối (Playwright E2E) Trên Microsoft Edge
```bash
cd e2e
node scripts/run_regression_tests.mjs
cd ..
```
*Kết quả: 100% kịch bản kiểm thử hồi quy thành công trên Microsoft Edge (v158.0.4370.33), bao gồm: ngắt mạng từng API riêng biệt, phục hồi mạng với nút Thử lại, xóa sạch trạng thái khi đổi input, quản lý động 1-4 yêu cầu ghép xe, và kiểm thử mobile drawer 390x844. Tự động lưu 9 ảnh chụp màn hình kiểm thử tại `outputs/screenshots/regression/`.*

---

## 🚢 Hướng Dẫn Triển Khai Thực Tế (Production Deployment)

### Cách 1: Triển khai Local Production Server
```bash
# 1. Build frontend:
cd frontend
npm run build
cd ..

# 2. Khởi động Backend phục vụ API và Static Files:
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Cách 2: Triển khai Đám Mây (Cloud / Docker)
- **Backend:** Triển khai trên **Render**, **Railway**, hoặc **AWS EC2** thông qua Dockerfile tiêu chuẩn chạy `uvicorn`.
- **Frontend:** Triển khai tĩnh (Static Hosting) trên **Vercel**, **Cloudflare Pages**, hoặc **Netlify** với lệnh build `npm run build` và thư mục xuất `dist`.
- Chi tiết cấu hình tham khảo tại: [docs/DEPLOYMENT_AND_TEST_REPORT.md](docs/DEPLOYMENT_AND_TEST_REPORT.md).

---

## 📚 Liên Kết Tài Liệu Đồ Án

- 📖 **Đề cương học phần & Câu hỏi vấn đáp chi tiết:** [docs/NYC_Taxi_DeCuong.md](docs/NYC_Taxi_DeCuong.md)
- 📋 **Biên bản nghiệm thu kỹ thuật:** [docs/NGHIEM_THU.md](docs/NGHIEM_THU.md)
- 📑 **Báo cáo kiểm thử toàn diện giao diện & chức năng:** [docs/BAO_CAO_KIEM_THU_GIAO_DIEN.md](docs/BAO_CAO_KIEM_THU_GIAO_DIEN.md)
- 📊 **Sổ tay thực nghiệm Jupyter Notebook:** [notebooks/NYC_Taxi_DuBao_TimDuong.ipynb](notebooks/NYC_Taxi_DuBao_TimDuong.ipynb)
- 📽️ **Bài trình bày báo cáo PowerPoint (14 slide):** [scripts/populate_presentation.py](scripts/populate_presentation.py) (Tự động sinh PPTX)
- 📈 **Bảng chỉ số đánh giá mô hình:** [outputs/metrics.json](outputs/metrics.json)
- 🖼️ **Thư mục ảnh chụp màn hình kiểm thử:** [outputs/screenshots/](outputs/screenshots/)

---
*Đồ án môn học Trí Tuệ Nhân Tạo (AI) - Hoàn thành xuất sắc tháng 11/2026.*
