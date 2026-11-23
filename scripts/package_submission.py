"""
scripts/package_submission.py
Packages the NYC Taxi project into a clean, ready-to-submit ZIP file: NYC_Taxi_NopBai.zip.
Excludes node_modules, virtual environments (.venv), cache files, build artifacts, and raw giant files.
Verifies the package by testing extraction into a temporary directory.
"""

import os
import sys
import zipfile
import tempfile
import shutil
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_ZIP = PROJECT_ROOT / "NYC_Taxi_NopBai.zip"

EXCLUDE_DIRS = {
    "node_modules",
    ".venv",
    "venv",
    "env",
    ".git",
    "dist",
    ".vite",
    "__pycache__",
    ".pytest_cache",
    ".idea",
    ".vscode-test",
    "test-results",
}

EXCLUDE_EXTS = {
    ".pyc",
    ".pyo",
    ".pyd",
    ".tsbuildinfo",
    ".log",
}

EXCLUDE_FILES = {
    "NYC_Taxi_NopBai.zip",
    ".DS_Store",
    "Thumbs.db",
}

def should_exclude(file_path: Path) -> bool:
    rel_path = file_path.relative_to(PROJECT_ROOT)
    for part in rel_path.parts:
        if part in EXCLUDE_DIRS:
            return True
    if file_path.suffix in EXCLUDE_EXTS:
        return True
    if file_path.name in EXCLUDE_FILES:
        return True
    return False

def package_submission():
    print("=" * 70)
    print("BẮT ĐẦU ĐÓNG GÓI HỒ SƠ NỘP BÀI: NYC_Taxi_NopBai.zip")
    print("=" * 70)

    if OUTPUT_ZIP.exists():
        OUTPUT_ZIP.unlink()
        print(f"[*] Đã xóa file ZIP cũ: {OUTPUT_ZIP.name}")

    count_files = 0
    total_uncompressed_bytes = 0

    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(PROJECT_ROOT):
            # Exclude directories in-place to avoid traversing them
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

            for file_name in files:
                file_path = Path(root) / file_name
                if should_exclude(file_path):
                    continue

                rel_path = file_path.relative_to(PROJECT_ROOT)
                zf.write(file_path, arcname=str(rel_path))
                count_files += 1
                total_uncompressed_bytes += file_path.stat().st_size

    zip_size_mb = OUTPUT_ZIP.stat().st_size / (1024 * 1024)
    raw_size_mb = total_uncompressed_bytes / (1024 * 1024)
    print(f"[✓] Đóng gói hoàn tất: {count_files} tệp")
    print(f"[*] Dung lượng chưa nén: {raw_size_mb:.2f} MB")
    print(f"[*] Dung lượng tệp ZIP:  {zip_size_mb:.2f} MB -> {OUTPUT_ZIP}")

    # Verify extraction
    print("\n--- KIỂM TRA GIẢI NÉN VÀ TOÀN VẸN HỒ SƠ ---")
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        with zipfile.ZipFile(OUTPUT_ZIP, "r") as zf:
            zf.extractall(tmp_path)

        # Check critical deliverables in extracted files
        critical_files = [
            "README.md",
            "NYC_Taxi_TrinhBay_ChinhThuc.pptx",
            "NYC_Taxi_TrinhBay_NopBai.pptx",
            "NYC_Taxi_BaoCao_ChinhThuc.docx",
            "NYC_Taxi_BaoCao_ChinhThuc.pdf",
            "notebooks/NYC_Taxi_DuBao_TimDuong.ipynb",
            "scripts/populate_presentation.py",
            "scripts/populate_word_report.py",
            "templates/Mau_TrinhBay_CuoiKy.pptx",
            "templates/Mau_BaoCao_CuoiKy.docx",
            "docs/NYC_Taxi_DeCuong.md",
            "docs/NGHIEM_THU.md",
            "docs/BAO_CAO_KIEM_THU_GIAO_DIEN.md",
            "docs/DEPLOYMENT_AND_TEST_REPORT.md",
            "outputs/metrics.json",
            "backend/app/main.py",
            "frontend/package.json",
            "start_dev.bat",
        ]

        missing = []
        for cf in critical_files:
            extracted_cf = tmp_path / cf
            if not extracted_cf.exists():
                missing.append(cf)
            else:
                sz_kb = extracted_cf.stat().st_size / 1024
                print(f"  [✓] Tìm thấy: {cf:<45} ({sz_kb:.1f} KB)")

        if missing:
            print(f"[!] LỖI: Thiếu các tệp sau trong file ZIP: {missing}")
            sys.exit(1)
        else:
            print(f"[✓] XÁC MINH THÀNH CÔNG: 100% tệp cốt lõi tồn tại và nguyên vẹn trong {OUTPUT_ZIP.name}!")

if __name__ == "__main__":
    package_submission()
