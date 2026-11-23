# Dữ liệu dự án NYC Taxi

Dự án sử dụng tập dữ liệu **NYC TLC Yellow Taxi Trip Records** (2016).

Để chuẩn bị dữ liệu huấn luyện hoặc thực nghiệm Notebook:
1. Chạy chế độ nhanh (Quick Mode - 50.000 dòng):
   ```bash
   python scripts/prepare_data.py --mode quick
   ```
2. Hoặc chạy chế độ đầy đủ (Full Mode - 250.000+ dòng từ Kaggle/TLC):
   ```bash
   python scripts/prepare_data.py --mode full
   ```

*Lưu ý: Mô hình học máy đã huấn luyện sẵn (`backend/app/ml/taxi_pipeline.joblib`) và đồ thị đường phố Manhattan (`backend/app/data/manhattan_graph.json`) đã được tích hợp sẵn trong repo để hệ thống Web và API có thể chạy demo ngay lập tức mà không cần tải thêm dữ liệu thô.*
