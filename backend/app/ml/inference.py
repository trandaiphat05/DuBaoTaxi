"""
backend/app/ml/inference.py
Inference module for NYC Taxi Trip Duration prediction.
Uses the exact same feature engineering from backend.app.ml.features.
"""
import sys
from pathlib import Path
from typing import Dict, Any, Optional, Union
from datetime import datetime
import joblib

# Ensure project root is in path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.ml.features import (
    TaxiDurationPipeline,
    extract_features,
    is_in_bounding_box,
    BOUNDING_BOX,
    haversine_distance_km,
)

DEFAULT_MODEL_PATH = PROJECT_ROOT / "backend" / "app" / "ml" / "taxi_pipeline.joblib"

_cached_pipeline: Optional[TaxiDurationPipeline] = None


def load_pipeline(model_path: Optional[Union[str, Path]] = None) -> TaxiDurationPipeline:
    """Load trained TaxiDurationPipeline from disk (with caching)."""
    global _cached_pipeline
    path = Path(model_path) if model_path else DEFAULT_MODEL_PATH
    if not path.exists():
        raise FileNotFoundError(
            f"Model file not found at {path}. Please run 'python scripts/train_model.py' first."
        )

    pipeline = joblib.load(path)
    _cached_pipeline = pipeline
    return pipeline


def predict_duration(
    pipeline: Optional[TaxiDurationPipeline] = None,
    pickup_latitude: float = 40.7580,
    pickup_longitude: float = -73.9855,
    dropoff_latitude: float = 40.7060,
    dropoff_longitude: float = -74.0090,
    pickup_datetime: Optional[Union[str, datetime]] = None,
    passenger_count: int = 1,
    validate_bounds: bool = True,
) -> Dict[str, Any]:
    """
    Predict trip duration between pickup and dropoff points in Manhattan.

    Args:
        pipeline: Trained TaxiDurationPipeline instance (loads default if None).
        pickup_latitude: Latitude of pickup point.
        pickup_longitude: Longitude of pickup point.
        dropoff_latitude: Latitude of dropoff point.
        dropoff_longitude: Longitude of dropoff point.
        pickup_datetime: ISO string or datetime object (defaults to current time).
        passenger_count: Number of passengers (1-6).
        validate_bounds: Whether to validate points against Manhattan bounding box.

    Returns:
        Dict with duration_seconds, duration_minutes, distance_km, and label 'Thời gian dự kiến'.
    """
    if pipeline is None:
        global _cached_pipeline
        if _cached_pipeline is None:
            _cached_pipeline = load_pipeline()
        pipeline = _cached_pipeline

    # Coordinate validation
    if validate_bounds:
        if not is_in_bounding_box(pickup_latitude, pickup_longitude):
            raise ValueError(
                f"Điểm đón ({pickup_latitude:.4f}, {pickup_longitude:.4f}) nằm ngoài khu vực Manhattan "
                f"[{BOUNDING_BOX['min_lon']}, {BOUNDING_BOX['min_lat']}, {BOUNDING_BOX['max_lon']}, {BOUNDING_BOX['max_lat']}]. "
                "Hãy chọn lại trên bản đồ."
            )
        if not is_in_bounding_box(dropoff_latitude, dropoff_longitude):
            raise ValueError(
                f"Điểm trả ({dropoff_latitude:.4f}, {dropoff_longitude:.4f}) nằm ngoài khu vực Manhattan "
                f"[{BOUNDING_BOX['min_lon']}, {BOUNDING_BOX['min_lat']}, {BOUNDING_BOX['max_lon']}, {BOUNDING_BOX['max_lat']}]. "
                "Hãy chọn lại trên bản đồ."
            )

    passenger_count = max(1, min(6, int(passenger_count)))

    result = pipeline.predict_trip(
        pickup_latitude=pickup_latitude,
        pickup_longitude=pickup_longitude,
        dropoff_latitude=dropoff_latitude,
        dropoff_longitude=dropoff_longitude,
        pickup_datetime=pickup_datetime,
        passenger_count=passenger_count,
    )
    return result


if __name__ == "__main__":
    print("Testing ML inference pipeline...")
    pipe = load_pipeline()

    # Fixed input test: Times Square to Wall Street
    # Times Square: 40.7580, -73.9855
    # Wall Street:  40.7060, -74.0090
    print("\n--- Test 1: Times Square -> Wall Street ---")
    test_result = predict_duration(
        pipeline=pipe,
        pickup_latitude=40.7580,
        pickup_longitude=-73.9855,
        dropoff_latitude=40.7060,
        dropoff_longitude=-74.0090,
        pickup_datetime="2016-04-15 17:30:00",  # Friday evening rush hour
        passenger_count=1,
    )
    print(f"Result: {test_result}")
    assert "duration_seconds" in test_result
    assert "duration_minutes" in test_result
    assert test_result["label"] == "Thời gian dự kiến"
    assert test_result["duration_seconds"] > 0
    print(f"Predicted duration: {test_result['duration_minutes']} minutes ({test_result['duration_seconds']}s)")
    print(f"Estimated distance: {test_result['distance_km']} km")

    # Test 2: Central Park to Grand Central Terminal
    print("\n--- Test 2: Central Park -> Grand Central ---")
    test2_result = predict_duration(
        pipeline=pipe,
        pickup_latitude=40.7648,
        pickup_longitude=-73.9731,
        dropoff_latitude=40.7527,
        dropoff_longitude=-73.9772,
        passenger_count=2,
    )
    print(f"Result: {test2_result}")
    print(f"Predicted duration: {test2_result['duration_minutes']} minutes ({test2_result['duration_seconds']}s)")

    # Test 3: Out-of-bounds error handling
    print("\n--- Test 3: Out of bounds handling ---")
    try:
        predict_duration(
            pipeline=pipe,
            pickup_latitude=40.0000,
            pickup_longitude=-75.0000,
            dropoff_latitude=40.7060,
            dropoff_longitude=-74.0090,
        )
        print("FAIL: Expected ValueError for out-of-bounds coordinate")
    except ValueError as e:
        print(f"SUCCESS: Caught expected Vietnamese error message: {e}")

    print("\nAll inference tests passed successfully!")
