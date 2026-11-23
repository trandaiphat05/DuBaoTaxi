# ĐỀ CƯƠNG ĐỒ ÁN MÔN HỌC: TRÍ TUỆ NHÂN TẠO (ARTIFICIAL INTELLIGENCE)

## Đề tài: Hệ Thống Dự Báo Thời Gian Di Chuyển, Tìm Đường Tối Ưu A* Và Điều Phối Ghép Chuyến Taxi New York (NYC Taxi AI Platform)

---

### MỤC LỤC
1. [Thông Tin Đồ Án & Nhóm Tác Giả](#1-thông-tin-đồ-án--nhóm-tác-giả)
2. [Mục Tiêu & Chuẩn Đầu Ra (Course Learning Outcomes - CLO)](#2-mục-tiêu--chuẩn-đầu-ra-course-learning-outcomes---clo)
3. [Nội Dung Đề Cương Chi Tiết Theo Học Phần](#3-nội-dung-đề-cương-chi-tiết-theo-học-phần)
   - [Chương 1: Tác tử Thông minh & Phát biểu Bài toán (PEAS Framework)](#chương-1-tác-tử-thông-minh--phát-biểu-bài-toán-peas-framework)
   - [Chương 2: Không gian Trạng thái & Giải thuật Tìm kiếm (A* vs Dijkstra)](#chương-2-không-gian-trạng-thái--giải-thuật-tìm-kiếm-a-vs-dijkstra)
   - [Chương 3: Học máy Có giám sát & Dự báo Hồi quy (Trip Duration Prediction)](#chương-3-học-máy-có-giám-sát--dự-báo-hồi-quy-trip-duration-prediction)
   - [Chương 4: Tối ưu hóa Điều phối & Ghép xe (Multi-passenger Ride-sharing Dispatch)](#chương-4-tối-ưu-hóa-điều-phối--ghép-xe-multi-passenger-ride-sharing-dispatch)
   - [Chương 5: Kiến trúc Tích hợp Hệ thống Thông minh & Đánh giá Thực nghiệm](#chương-5-kiến-trúc-tích-hợp-hệ-thống-thông-minh--đánh-giá-thực-nghiệm)
4. [Bộ Câu Hỏi Vấn Đáp & Trả Lời Chi Tiết (Syllabus Mapped Questions)](#4-bộ-câu-hỏi-vấn-đáp--trả-lời-chi-tiết-syllabus-mapped-questions)
5. [Kế Hoạch Thực Hiện & Tiêu Chuẩn Nghiệm Thu](#5-kế-hoạch-thực-hiện--tiêu-chuẩn-nghiệm-thu)

---

### 1. Thông Tin Đồ Án & Nhóm Tác Giả
- **Tên học phần:** Trí Tuệ Nhân Tạo (Artificial Intelligence)
- **Mã học phần:** CS301 / IT3040
- **Tên đề tài:** Hệ thống Tích hợp Dự báo Thời gian Di chuyển, Định tuyến Đường ngắn nhất A* và Điều phối Ghép chuyến Đa khách Taxi Manhattan (New York City Taxi Duration Prediction, A* Routing & Ride-sharing Dispatch)
- **Tập dữ liệu sử dụng:** New York City Taxi Trip Duration (Kaggle Dataset / NYC TLC Trip Record Data)
- **Môi trường triển khai:** Python 3.10+, FastAPI RESTful Services, React 18 + TypeScript + Leaflet Web GIS.

---

### 2. Mục Tiêu & Chuẩn Đầu Ra (Course Learning Outcomes - CLO)
Đồ án được thiết kế nhằm hiện thực hóa và đánh giá năng lực của sinh viên theo các chuẩn đầu ra cốt lõi của môn học Trí tuệ Nhân tạo:

- **CLO1 (Knowledge - Kiến thức cơ sở):** Nắm vững lý thuyết về Tác tử thông minh (Intelligent Agents), phân loại môi trường (PEAS), biểu diễn không gian trạng thái (State Space Representation), các giải thuật tìm kiếm trong đồ thị (Dijkstra, A*), và các nguyên lý học có giám sát (Supervised Learning Regression).
- **CLO2 (Analysis & Modeling - Phân tích & Mô hình hóa):** Phân tích bài toán thực tế giao thông đô thị; chứng minh tính chấp nhận được (Admissibility) và tính nhất quán (Consistency) của hàm Heuristic khoảng cách mặt cầu (Haversine Heuristic); xây dựng không gian trạng thái bài toán ghép xe có ràng buộc sức chứa (Capacity-constrained Dial-A-Ride Problem).
- **CLO3 (Design & Implementation - Thiết kế & Cài đặt):** Tự cài đặt trọn vẹn giải thuật tìm kiếm A*, Dijkstra trên đồ thị thực tế OpenStreetMap của khu vực Manhattan; xây dựng quy trình kỹ thuật đặc trưng không gian - thời gian (Spatial-Temporal Feature Engineering); huấn luyện mô hình học máy Gradient Boosting; giải bài toán tối ưu điều phối đón - trả nhiều khách.
- **CLO4 (Evaluation & System Integration - Đánh giá & Tích hợp):** So sánh định lượng hiệu quả thuật toán (Số nút duyệt, thời gian thực thi của A* vs Dijkstra; MAE, RMSLE của mô hình ML so với Baseline Median; tỷ lệ tiết kiệm quãng đường và thời gian của hệ thống ghép xe); xây dựng hệ thống hoàn chỉnh từ Backend API đến Frontend GIS trực quan.

---

### 3. Nội Dung Đề Cương Chi Tiết Theo Học Phần

#### Chương 1: Tác tử Thông minh & Phát biểu Bài toán (PEAS Framework)
1. **Mô hình Tác tử Điều vận Giao thông Thông minh (Smart Mobility Agent):**
   - **Performance Measure (Tiêu chí đánh giá):** 
     - Sai số dự báo thời gian hành trình tối thiểu ($MAE < 5\text{ phút}$, $RMSLE < 0.40$).
     - Chi phí quãng đường tìm kiếm đạt cực tiểu toàn cục ($d_{opt}$).
     - Số nút mở rộng trong quá trình tìm đường là tối thiểu (tối ưu tài nguyên CPU/RAM).
     - Tổng thời gian phục vụ toàn bộ khách hàng trong bài toán ghép xe giảm ít nhất $15\% - 30\%$ so với đón tuần tự.
   - **Environment (Môi trường):**
     - Đồ thị đường bộ có hướng Manhattan ($G = (V, E)$) với các cung một chiều, giới hạn tốc độ và trọng số chiều dài thực tế.
     - Dữ liệu lịch sử các chuyến taxi tại New York City với tọa độ đón/trả, thời gian, số lượng hành khách.
     - Tính chất môi trường: Động một phần (Partially Dynamic), Rời rạc (Discrete states on graph), Có tính ngẫu nhiên (Stochastic do tắc đường, thời tiết).
   - **Actuators (Cơ cấu tác động):**
     - Gợi ý tuyến đường ngắn nhất (chuỗi tọa độ GeoJSON).
     - Trả về thời gian dự báo chuyến đi (phút/giây).
     - Lập lịch lộ trình ghé đón/trả (chuỗi trạm dừng và trạng thái tải trọng xe).
   - **Sensors (Cảm biến / Dữ liệu đầu vào):**
     - Tọa độ GPS điểm đón và điểm trả từ người dùng.
     - Dữ liệu thời gian xuất phát (giờ trong ngày, ngày trong tuần).
     - Số lượng hành khách yêu cầu chuyến đi.
2. **Phạm vi bài toán không gian (Spatial Scope):**
   - Vùng trung tâm Manhattan với Bounding Box: Kinh độ $\text{lon} \in [-74.05, -73.90]$, Vĩ độ $\text{lat} \in [40.69, 40.88]$.
   - Lọc bỏ nhiễu: Chuyến đi có thời gian $60\text{s} \le \text{duration} \le 7200\text{s}$ (2 giờ), số khách $1 \le \text{passengers} \le 6$.

---

#### Chương 2: Không gian Trạng thái & Giải thuật Tìm kiếm (A* vs Dijkstra)
1. **Mô hình hóa Đồ thị Giao thông Thực tế:**
   - Đồ thị có hướng đa cung (Directed Multigraph) trích xuất từ dữ liệu OpenStreetMap (OSM) của Manhattan.
   - Các đỉnh $V$: Các nút giao thông, ngã ba, ngã tư với tọa độ $(\text{lat}, \text{lon})$.
   - Các cung $E$: Các đoạn đường bộ một chiều hoặc hai chiều, mang thuộc tính độ dài (mét), loại đường (highway type), và tốc độ tối đa quy định.
2. **Giải thuật Tìm kiếm Dijkstra (Tìm kiếm chi phí đều - Uniform Cost Search):**
   - Chiến lược: Mở rộng nút $u$ có khoảng cách tích lũy $g(u)$ nhỏ nhất trong hàng đợi ưu tiên (Priority Queue / Min-Heap).
   - Đảm bảo tìm được đường đi ngắn nhất nhưng phải mở rộng vòng tròn lan tỏa đều khắp không gian, dẫn đến việc duyệt nhiều nút không cần thiết.
3. **Giải thuật Tìm kiếm Có thông tin A\* (A-Star Search):**
   - Hàm đánh giá: $f(n) = g(n) + h(n)$, trong đó:
     - $g(n)$: Chi phí thực tế đã đi từ nút xuất phát $S$ đến nút $n$.
     - $h(n)$: Ước lượng chi phí từ nút $n$ đến đích $T$.
   - **Thiết kế Hàm Heuristic $h(n)$ - Khoảng cách Haversine (Great-Circle Distance):**
     $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
     với $R = 6,371,000\text{ m}$ là bán kính Trái Đất.
   - **Chứng minh tính Chấp nhận được (Admissibility):** Do khoảng cách đường chim bay (Haversine) giữa hai điểm luôn nhỏ hơn hoặc bằng độ dài đường đi bộ/đường xe chạy thực tế trên mạng lưới đường bộ cong và gấp khúc ($h(n) \le h^*(n)$), hàm Heuristic luôn chấp nhận được.
   - **Chứng minh tính Nhất quán (Consistency / Monotonicity):** Theo bất đẳng thức tam giác cầu trên mặt phẳng Trái Đất: $h(u) \le c(u, v) + h(v)$ với mọi cung $(u, v)$, đảm bảo một khi đỉnh được rút ra khỏi hàng đợi ưu tiên, chi phí $g$ đã đạt tối ưu và không cần duyệt lại.
4. **Phân tích Thực nghiệm Đối sánh A\* vs Dijkstra:**
   - Kiểm chứng tính đúng đắn trên 5 cặp kiểm chứng: Tổng chiều dài tuyến đường ngắn nhất do A\* và Dijkstra tìm ra là hoàn toàn trùng khớp ($100\%$, sai số $0.0\text{ m}$).
   - Đánh giá hiệu năng: A\* giảm số nút cần mở rộng (Visited Nodes) trung bình $73.56\%$ (từ $73.1\%$ đến $95.4\%$) so với Dijkstra, giúp giảm độ trễ truy vấn xuống dưới $15\text{ms}$.
   - Thuyết minh khoảng cách: Chi phí đường đi trên đồ thị thuần túy là $6.808,74\text{ m}$; khoảng cách nối snapping từ GPS đến nút đồ thị gần nhất là $11,4\text{ m}$ (~$4,3\text{ m}$ đón + ~$7,1\text{ m}$ trả); tổng cự ly hành trình API trả về là $6.820,2\text{ m}$ ($6.82\text{ km}$). Cả hai chỉ số đều chuẩn xác theo góc nhìn đồ thị và cự ly thực tế.
   - Khi mất kết nối: Hệ thống hiển thị thông báo lỗi cụ thể kèm nút "Thử lại", không sinh lộ trình giả. Xóa sạch lộ trình cũ ngay khi đổi điểm đón/trả.

---

#### Chương 3: Học máy Có giám sát & Dự báo Hồi quy (Trip Duration Prediction)
1. **Đặc trưng Dữ liệu & Thách thức Bài toán:**
   - Dữ liệu NYC Taxi là bài toán hồi quy (Regression) dự báo biến mục tiêu liên tục: `trip_duration` (thời gian chuyến đi tính bằng giây).
   - Phân phối mục tiêu bị lệch phải mạnh (Right-skewed / Log-normal Distribution). Biến đổi hàm mục tiêu: $y = \log(1 + \text{trip\_duration})$ hoặc huấn luyện trực tiếp tối ưu hàm mất mát RMSLE.
2. **Kỹ thuật Đặc trưng Không gian - Thời gian (Spatial-Temporal Feature Engineering):**
   - **Đặc trưng Không gian:**
     - Tọa độ đón: `pickup_longitude`, `pickup_latitude`.
     - Tọa độ trả: `dropoff_longitude`, `dropoff_latitude`.
     - Khoảng cách Haversine (Great-circle distance).
     - Khoảng cách Manhattan ($L_1\text{ distance} = \Delta \text{lat} + \Delta \text{lon}$ quy đổi ra mét), phản ánh cấu trúc bàn cờ đặc trưng của khu Manhattan.
     - Góc phương vị di chuyển (Bearing / Azimuth Angle): Hướng xe chạy (Bắc - Nam, Đông - Tây).
   - **Đặc trưng Thời gian:**
     - Giờ đón trong ngày (`pickup_hour` từ 0 đến 23): Nắm bắt các khung giờ cao điểm (sáng 8-9h, chiều 17-19h).
     - Ngày trong tuần (`pickup_dayofweek` từ 0 đến 6): Phân biệt ngày làm việc và cuối tuần.
     - Cờ cuối tuần (`is_weekend`): Biến nhị phân.
   - **Đặc trưng Tải trọng & Vận hành:**
     - Số lượng hành khách (`passenger_count`).
     - Tỷ số tốc độ xấp xỉ dự kiến (`distance / duration_estimate`).
3. **Chiến lược Chia tập Huấn luyện và Kiểm thử (Validation Strategy):**
   - **Nguyên tắc Chia theo Thời gian (Time-based Split):** Không sử dụng phân chia ngẫu nhiên (Random Split) do vi phạm giả định chuỗi thời gian, dẫn đến hiện tượng Rò rỉ dữ liệu (Data Leakage). Tập Train bao gồm các chuyến đi trước mốc thời gian phân tách, tập Validation gồm các chuyến đi sau mốc đó.
4. **Các Mô hình Thực nghiệm:**
   - **Mô hình Cơ sở (Baseline Model):** Dự báo bằng giá trị Trung vị (Median Duration) hoặc Vận tốc trung bình theo khoảng cách Manhattan.
   - **Mô hình Học máy Ensemble:** HistGradientBoostingRegressor / GradientBoostingRegressor.
     - Xử lý mượt mà dữ liệu quy mô lớn (hàng triệu dòng) nhờ thuật toán băm Histogram (tương tự LightGBM).
     - Hỗ trợ tốt các tương tác phi tuyến tính phức tạp giữa vị trí địa lý và thời gian cao điểm.
5. **Tiêu chuẩn Đánh giá:**
   - **MAE (Mean Absolute Error):** Đo lường sai số trung bình tuyệt đối tính bằng phút (trực quan với người dùng thực tế).
   - **RMSLE (Root Mean Squared Logarithmic Error):** Phạt cân bằng giữa dự báo thừa và dự báo thiếu, giảm tác động của các giá trị ngoại lai (outliers) do kẹt xe đột xuất:
     $$\text{RMSLE} = \sqrt{\frac{1}{N} \sum_{i=1}^N \left(\log(y_i + 1) - \log(\hat{y}_i + 1)\right)^2}$$

---

#### Chương 4: Tối ưu hóa Điều phối & Ghép xe (Multi-passenger Ride-sharing Dispatch)
1. **Định dạng Bài toán Ghép chuyến (Dial-A-Ride Problem - DARP):**
   - Xe taxi xuất phát từ vị trí ban đầu $P_0$, nhận danh sách $K$ yêu cầu của hành khách ($K=3$ khách).
   - Mỗi yêu cầu $k = (P_k, D_k, s_k)$:
     - $P_k$: Điểm đón của khách $k$.
     - $D_k$: Điểm trả của khách $k$.
     - $s_k$: Số lượng ghế yêu cầu.
   - Xe có sức chứa tối đa $C$ (Capacity, ví dụ $C=4$ chỗ).
2. **Không gian Trạng thái & Các Ràng buộc Cốt lõi:**
   - Trạng thái của từng khách hàng: 
     - Trạng thái 0: Chưa đón (Unpicked).
     - Trạng thái 1: Đã đón, đang trên xe (In-transit).
     - Trạng thái 2: Đã trả (Dropped-off).
   - **Ràng buộc thứ tự (Precedence Constraint):** $P_k$ phải được ghé trước $D_k$.
   - **Ràng buộc sức chứa (Capacity Constraint):** Tại mọi thời điểm ghé trạm, tải trọng hành khách trên xe $L_t \le C$.
   - Trạng thái kết thúc (Terminal State): Toàn bộ $K$ khách đều đạt trạng thái 2.
3. **Thuật toán Tìm kiếm Nhánh cận Chính xác (Branch & Bound Exact Search):**
   - Ma trận chi phí thời gian/quãng đường $Cost(u, v)$ giữa tất cả các điểm dừng được tính toán trước bằng thuật toán A\*.
   - Quá trình duyệt nhánh tìm chuỗi hoán vị hợp lệ của các điểm dừng sao cho tổng chi phí $\sum Cost$ là nhỏ nhất.
   - Tỉa nhánh (Pruning): Cắt bỏ các nhánh vi phạm ràng buộc tải trọng hoặc nhánh có chi phí tích lũy vượt quá nghiệm tốt nhất hiện tại.
4. **So sánh Đối chuẩn với Mô hình Tuần tự (Sequential Baseline):**
   - Phương thức tuần tự truyền thống: Xe phục vụ hết khách 1 ($P_1 \to D_1$), sau đó mới đón khách 2 ($P_2 \to D_2$), rồi đến khách 3 ($P_3 \to D_3$).
   - Phương thức ghép chuyến tối ưu (Pooled Shared Dispatch): Xe có thể đón liên tiếp khách 1 và khách 2 trước khi trả khách 1 (ví dụ $P_1 \to P_2 \to D_1 \to P_3 \to D_2 \to D_3$).
   - Kết quả: Giảm từ $20\% - 51.6\%$ tổng thời gian xe chạy ước tính và giảm quãng đường di chuyển không tải so với phương án tuần tự (lưu ý: chỉ số đo lường hình học trên mạng lưới đường bộ, không suy diễn trực tiếp sang phát thải carbon do chưa có thông số thực tế của đội xe).

---

#### Chương 5: Kiến trúc Tích hợp Hệ thống Thông minh & Đánh giá Thực nghiệm
1. **Kiến trúc Tổng thể Hệ thống:**
   - **Lớp Dữ liệu (Data Layer):** Lưu trữ tập mẫu NYC Taxi, file đồ thị Manhattan đã được tiền xử lý (`manhattan_graph.json`), mô hình học máy đóng gói (`taxi_pipeline.joblib`).
   - **Lớp Lõi Trí tuệ Nhân tạo (AI Core Services):**
     - Module Hồi quy: Trích xuất đặc trưng và suy luận thời gian chuyến đi.
     - Module Định tuyến: Đồ thị mạng lưới đường bộ, thuật toán tìm kiếm A\* & Dijkstra với Heuristic Haversine.
     - Module Điều phối: Bộ giải thuật nhánh cận lập lịch ghép xe.
   - **Lớp Dịch vụ Backend (FastAPI Application):** Cung cấp các RESTful API chuẩn hóa, kiểm tra dữ liệu đầu vào (Bounding box Manhattan), xử lý lỗi thân thiện bằng tiếng Việt.
   - **Lớp Giao diện Người dùng (React Web GIS UI):** Bản đồ tương tác Leaflet, cho phép chọn điểm trực quan, hỗ trợ 3 tính năng: Dự báo chuyến, Tìm đường tối ưu, Đón nhiều khách; hỗ trợ chế độ xem Desktop và Mobile.
2. **Kịch bản Thử nghiệm & Tiêu chí Nghiệm thu (Acceptance Criteria):**
   - Kiểm thử đơn vị (Unit Test) cho các module tìm kiếm, hồi quy và điều phối.
   - Kiểm thử tích hợp API (Integration Test) kiểm tra các trường hợp ngoại lệ (tọa độ ngoài Manhattan, điểm đón trùng điểm trả, vượt quá tải trọng xe).
   - Kiểm thử đầu cuối (End-to-End Test bằng Playwright) chụp ảnh màn hình minh chứng hoạt động trơn tru.

---

### 4. Bộ Câu Hỏi Vấn Đáp & Trả Lời Chi Tiết (Syllabus Mapped Questions)

#### Nhóm 1: Lý Thuyết Tìm Kiếm & Đồ Thị (Search & Knowledge Representation)

**Câu hỏi 1.1:** *Tại sao trong bài toán tìm đường ngắn nhất trên đồ thị đường bộ thực tế, giải thuật A\* lại vượt trội hơn giải thuật Dijkstra? Điều kiện để A\* tìm được nghiệm tối ưu là gì?*
> **Trả lời:**
> - Giải thuật Dijkstra là một dạng tìm kiếm chi phí đều (Uniform Cost Search - UCS), duyệt mọi đỉnh theo vòng tròn lan tỏa đều quanh điểm xuất phát với chi phí $g(n)$ tăng dần mà không biết điểm đích nằm ở hướng nào. Điều này dẫn đến việc mở rộng rất nhiều đỉnh không nằm trên hướng di chuyển đến đích.
> - Giải thuật A\* kết hợp chi phí thực tế $g(n)$ với hàm đánh giá định hướng $h(n)$ (khoảng cách dự kiến đến đích) qua hàm $f(n) = g(n) + h(n)$. Nhờ đó, hàng đợi ưu tiên luôn ưu tiên mở rộng các nút hướng về phía đích, thu hẹp không gian tìm kiếm thành một hình elip hoặc hình quạt hướng tâm.
> - **Điều kiện để A\* tìm được đường đi ngắn nhất tối ưu:**
>   1. **Tính chấp nhận được (Admissible):** Hàm heuristic $h(n)$ không bao giờ ước lượng cao hơn chi phí thực tế nhỏ nhất đến đích, tức là $0 \le h(n) \le h^*(n)$ với mọi $n$.
>   2. **Tính nhất quán (Consistent / Monotonic):** Với mọi nút $n$ và nút kế cận $n'$ qua cung có chi phí $c(n, n')$, ta phải có $h(n) \le c(n, n') + h(n')$. Khi tính nhất quán thỏa mãn, A\* duyệt đồ thị không cần xem xét lại các nút đã đóng (closed set).

**Câu hỏi 1.2:** *Tại sao đồ án lựa chọn hàm khoảng cách Haversine làm Heuristic mà không dùng khoảng cách Manhattan ($L_1$) hay khoảng cách Euclid ($L_2$) phẳng? Hãy chứng minh tính chấp nhận được của hàm này.*
> **Trả lời:**
> - Tọa độ điểm trên Trái Đất được biểu diễn dưới dạng vĩ độ và kinh độ (độ cầu). Khoảng cách Euclid phẳng ($L_2 = \sqrt{\Delta x^2 + \Delta y^2}$) trên tọa độ độ sẽ gây sai lệch lớn do kinh độ bị co lại khi vĩ độ càng xa xích đạo (tại New York vĩ độ $40.7^\circ\text{N}$, $1^\circ$ kinh độ ngắn hơn $1^\circ$ vĩ độ đáng kể).
> - Khoảng cách Manhattan ($L_1$) mặc dù phù hợp với đường ô cờ nhưng nếu tính theo hệ trục Bắc - Nam thông thường sẽ bị vi phạm tính chấp nhận được nếu các đại lộ ở Manhattan nghiêng khoảng $29^\circ$ so với hướng Bắc địa lý thực tế.
> - Khoảng cách Haversine tính toán độ dài cung tròn lớn (Great-circle distance) trên mặt cầu Trái Đất, chính là đường ngắn nhất nối hai điểm trong không gian thực tế (đường chim bay).
> - **Chứng minh:** Mọi tuyến đường bộ thực tế nối điểm $A$ và điểm $B$ đều phải uốn lượn theo các tòa nhà, góc cua và giao lộ, do đó độ dài đường bộ $d_{road}(A, B)$ luôn thỏa mãn:
>   $$h(A, B) = d_{\text{Haversine}}(A, B) \le d_{\text{road}}(A, B) = h^*(A, B)$$
>   Vì vậy, $h(A, B)$ tuyệt đối chấp nhận được (Admissible).

**Câu hỏi 1.3:** *Làm thế nào để xử lý các thuộc tính thực tế của mạng lưới giao thông như đường một chiều (one-way) và nhiều cung song song (parallel edges) trong mô hình đồ thị?*
> **Trả lời:**
> - Hệ thống sử dụng mô hình Đồ thị có hướng đa cung (Directed MultiDiGraph).
> - Đường một chiều được biểu diễn bằng một cung đơn có hướng duy nhất $(u \to v)$. Cung ngược chiều $(v \to u)$ hoàn toàn không tồn tại trong danh sách kề của đỉnh $v$.
> - Đường hai chiều được biểu diễn bằng hai cung có hướng đối nghịch độc lập: $(u \to v)$ và $(v \to u)$.
> - Các cung song song giữa cùng một cặp nút giao $(u, v)$ (ví dụ làn chính và làn phụ, cầu vượt hoặc các loại làn xe khác nhau) được định danh bởi một khóa duy nhất `edge_key`. Khi duyệt kề, thuật toán A\* duyệt qua từng `key` trong tập cung nối giữa $u$ và $v$, lựa chọn cung có trọng số chiều dài nhỏ nhất để xét cập nhật khoảng cách.

---

#### Nhóm 2: Học Máy & Kỹ Thuật Dữ Liệu (Machine Learning & Data Engineering)

**Câu hỏi 2.1:** *Tại sao việc chia tập Train/Validation theo phương pháp ngẫu nhiên (Random Train-Test Split) là sai lầm trong bài toán giao thông NYC Taxi? Cần khắc phục như thế nào?*
> **Trả lời:**
> - Dữ liệu giao thông có tính chất biến thiên mạnh theo thời gian (chuỗi thời gian - Time Series Data), chịu ảnh hưởng của xu hướng mùa vụ (seasonality), thời tiết, sự kiện lễ hội và xu hướng phát triển hạ tầng đô thị.
> - Nếu sử dụng Random Split, mô hình sẽ dùng dữ liệu của "tương lai" để dự báo cho các chuyến đi trong "quá khứ" diễn ra cùng ngày hoặc cùng giờ, dẫn đến hiện tượng Rò rỉ dữ liệu thời gian (Temporal Data Leakage). Mô hình có thể đạt điểm đánh giá rất cao trên tập kiểm thử giả lập nhưng sẽ thất bại khi đưa vào vận hành thực tế.
> - **Giải pháp:** Sử dụng phân chia theo mốc thời gian (Time-based Split). Toàn bộ dữ liệu được sắp xếp theo `pickup_datetime`. Chọn một điểm thời gian làm ngưỡng cắt: tất cả chuyến đi trước mốc thời gian đó thuộc tập Huấn luyện (Train set), và tất cả chuyến đi sau mốc đó thuộc tập Đánh giá (Validation set).

**Câu hỏi 2.2:** *Tại sao chỉ số RMSLE (Root Mean Squared Logarithmic Error) lại được ưu tiên sử dụng thay vì RMSE chuẩn trong các cuộc thi dự báo thời gian chuyến đi (như Kaggle NYC Taxi)?*
> **Trả lời:**
> - Phân phối của thời gian di chuyển `trip_duration` có đuôi dài lệch phải (Long-tail Right-skewed distribution). Một số ít chuyến đi có thời gian rất dài do tắc đường nghiêm trọng hoặc tai nạn giao thông.
> - Hàm mất mát RMSE ($\sqrt{\frac{1}{N}\sum (y - \hat{y})^2}$) phạt theo bình phương độ lệch tuyệt đối. Điều này khiến mô hình bị chi phối bởi các giá trị ngoại lai cực lớn, làm sai lệch trọng số hồi quy đối với đa số các chuyến đi bình thường.
> - RMSLE tính toán độ lệch trên thang đo logarit:
>   $$\log(y + 1) - \log(\hat{y} + 1) = \log\left(\frac{y+1}{\hat{y}+1}\right)$$
>   Điều này biến đổi sai số thành tỷ lệ phần trăm tương đối. Sai số chênh lệch 5 phút trên chuyến đi 10 phút bị phạt nặng hơn nhiều so với sai số chênh lệch 5 phút trên chuyến đi 60 phút. Đồng thời, RMSLE phạt trường hợp dự báo thiếu (Underestimation) nặng hơn dự báo thừa (Overestimation), rất phù hợp với bài toán gọi xe taxi (khách hàng thà được thông báo đến muộn một chút còn hơn bị trễ hẹn do tài xế đến quá muộn so với dự báo).

**Câu hỏi 2.3:** *Nêu các đặc trưng công phu (Feature Engineering) đã được xây dựng từ tọa độ và thời gian nguyên thủy, và giải thích ý nghĩa vật lý của chúng.*
> **Trả lời:**
> 1. **Khoảng cách Haversine (Great-circle distance):** Đường chim bay vật lý giữa điểm đón và điểm trả.
> 2. **Khoảng cách Manhattan ($L_1$ Distance):** Tính theo công thức $\Delta x + \Delta y$ quy đổi ra mét. Do mạng lưới quy hoạch của Manhattan có dạng ô bàn cờ (Grid layout), khoảng cách xe chạy trên thực tế xấp xỉ tỉ lệ thuận với khoảng cách Manhattan.
> 3. **Góc phương vị (Bearing / Azimuth Angle):** Góc lệch giữa hướng di chuyển và hướng Bắc thực tế (tính từ $0^\circ$ đến $360^\circ$). Đặc trưng này giúp mô hình nhận diện xe đang chạy dọc theo các Đại lộ (Avenues - hướng Bắc Nam) hay các Phố nhánh (Streets - hướng Đông Tây).
> 4. **Giờ đón trong ngày (`pickup_hour`):** Nắm bắt các đợt cao điểm giao thông buổi sáng (8h-9h) và tan tầm chiều (17h-19h).
> 5. **Ngày trong tuần (`pickup_dayofweek`):** Phản ánh sự khác biệt về mật độ lưu thông giữa các ngày trong tuần và hai ngày cuối tuần (Thứ Bảy, Chủ Nhật).
> 6. **Cờ cuối tuần (`is_weekend`):** Biến nhị phân hỗ trợ cây quyết định tách nhanh các nhóm dữ liệu có mẫu giao thông khác biệt.

---

#### Nhóm 3: Tối Ưu Hóa & Lập Lịch Điều Phối (Optimization & Dispatching)

**Câu hỏi 3.1:** *Phát biểu bài toán Ghép chuyến đa khách (Multi-passenger Ride-sharing Problem). Độ phức tạp của không gian trạng thái khi số lượng khách tăng lên là bao nhiêu?*
> **Trả lời:**
> - Cho 1 xe taxi với sức chứa tối đa $C$ chỗ ngồi và $K$ yêu cầu của hành khách. Mỗi yêu cầu $i$ gồm điểm đón $P_i$, điểm trả $D_i$, và số chỗ ngồi $s_i$. Xe phải xuất phát từ vị trí hiện tại $P_0$, ghé thăm tất cả $2K$ điểm dừng $\{P_1, D_1, P_2, D_2, \dots, P_K, D_K\}$ sao cho:
>   - Điểm đón $P_i$ luôn được ghé trước điểm trả $D_i$ ($\forall i \in \{1 \dots K\}$).
>   - Tổng số khách trên xe tại bất kỳ chặng nào không vượt quá $C$.
>   - Tổng thời gian hoặc quãng đường di chuyển toàn bộ lộ trình đạt giá trị nhỏ nhất.
> - **Độ phức tạp không gian trạng thái:**
>   - Không gian hoán vị của $2K$ điểm là $(2K)!$.
>   - Ràng buộc đón trước trả sau ($P_i$ trước $D_i$) làm giảm số lượng hoán vị hợp lệ xuống còn:
>     $$\frac{(2K)!}{2^K}$$
>   - Với $K=3$ khách ($6$ điểm dừng): $\frac{6!}{2^3} = \frac{720}{8} = 90$ trạng thái lộ trình có thể xảy ra.
>   - Với $K=4$ khách ($8$ điểm dừng): $\frac{8!}{2^4} = \frac{40,320}{16} = 2,520$ trạng thái lộ trình. Thuật toán nhánh cận duyệt xong dưới $20\text{ms}$.
>   - Khi $K \ge 5$, không gian trạng thái bắt đầu bùng nổ tổ hợp ($K=5$ có 113,400 trạng thái). Do đó, hệ thống khống chế cận trên tối đa 4 yêu cầu đón trả đồng thời ($K \in [1, 4]$) để đảm bảo thời gian phản hồi tức thì cho trải nghiệm tương tác Web GIS.
>   - Ràng buộc tải trọng xe $C$ tiếp tục loại bỏ các nhánh không khả thi (ví dụ đón khách vượt quá số ghế), giúp không gian tìm kiếm nhánh cận (Branch & Bound) hội tụ cực nhanh.

**Câu hỏi 3.2:** *Giải thuật nhánh cận (Branch & Bound) trong đồ án đã tỉa nhánh (pruning) dựa trên những điều kiện cụ thể nào?*
> **Trả lời:**
> Thuật toán thực hiện tỉa nhánh ngay khi khám phá trạng thái tiếp theo dựa trên 3 tiêu chí:
> 1. **Tỉa theo Ràng buộc Thứ tự (Precedence Pruning):** Nếu điểm định ghé tiếp theo là điểm trả $D_i$ nhưng hành khách $i$ chưa được đón (trạng thái của khách $i \ne 1$), nhánh này lập tức bị hủy bỏ.
> 2. **Tỉa theo Ràng buộc Sức chứa (Capacity Pruning):** Nếu điểm định ghé tiếp theo là điểm đón $P_i$ nhưng tải trọng hiện tại cộng với số khách mới vượt quá sức chứa cho phép ($Load + s_i > C$), nhánh này bị loại bỏ.
> 3. **Tỉa theo Cận trên Chi phí (Cost Bound Pruning):** Hệ thống duy trì biến `best_cost` lưu giữ tổng chi phí nhỏ nhất tìm được từ một lộ trình hợp lệ hoàn chỉnh trước đó. Tại bất kỳ bước duyệt trung gian nào, nếu chi phí tích lũy hiện tại $Current\_Cost \ge best\_cost$, nhánh duyệt bị cắt tỉa ngay lập tức vì việc tiếp tục đi thêm sẽ chỉ làm tăng chi phí.

---

### 5. Kế Hoạch Thực Hiện & Tiêu Chuẩn Nghiệm Thu

| Giai đoạn | Nội dung công việc | Đầu ra dự kiến |
|:---|:---|:---|
| **P1: Dữ liệu & Học máy** | Lọc dữ liệu NYC Taxi, kỹ thuật đặc trưng, huấn luyện mô hình HistGradientBoosting | `data/nyc_taxi_sample.csv`, `taxi_pipeline.joblib`, `outputs/metrics.json` |
| **P2: Thuật toán Đồ thị & Điều phối** | Trích xuất đồ thị Manhattan OSM, cài đặt A*, Dijkstra, thuật toán điều phối ghép xe | `manhattan_graph.json`, `routing.py`, `scheduler.py` |
| **P3: Dịch vụ Backend & API** | Xây dựng FastAPI app, chuẩn hóa API REST, quản lý lỗi tiếng Việt | `backend/app/main.py`, `backend/tests/` |
| **P4: Giao diện Web GIS** | Xây dựng giao diện React + TypeScript + Leaflet với 3 phân hệ trực quan | `frontend/`, bản đồ tương tác, responsive |
| **P5: Kiểm thử, Báo cáo & Tài liệu** | Kiểm thử Playwright E2E, xuất báo cáo nghiệm thu, tài liệu đề cương và slide thuyết trình | `NYC_Taxi_DeCuong.md`, `NGHIEM_THU.md`, `NYC_Taxi_TrinhBay.pptx`, `README.md` |

---
*Tài liệu đề cương học phần Trí Tuệ Nhân Tạo được hoàn thiện nhằm phục vụ bảo vệ đồ án và giảng dạy lý thuyết gắn liền với ứng dụng thực tế.*
