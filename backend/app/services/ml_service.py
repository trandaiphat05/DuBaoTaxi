"""Machine Learning inference service for NYC Taxi Trip Duration."""

from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from backend.app.ml.inference import predict_duration
from backend.app.services.geo_utils import (
    haversine_distance_meters,
    validate_passenger_count,
    validate_trip_coordinates,
)


class MLService:
    def __init__(self):
        self.model_name = "HistGradientBoostingRegressor (ML Pipeline)"
        self.is_loaded = True

    def reload_model(self) -> bool:
        """Attempt to check/load pipeline."""
        self.is_loaded = True
        return True

    def predict(
        self,
        pickup_lon: float,
        pickup_lat: float,
        dropoff_lon: float,
        dropoff_lat: float,
        passenger_count: int = 1,
        pickup_datetime: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Predict trip duration in seconds and minutes.
        Validates coordinates and passenger count with Vietnamese error messages.
        """
        # 1. Validate inputs with exact Vietnamese messages
        validate_trip_coordinates(pickup_lon, pickup_lat, dropoff_lon, dropoff_lat)
        validate_passenger_count(passenger_count)

        # 2. Call ML inference pipeline
        res = predict_duration(
            pickup_latitude=pickup_lat,
            pickup_longitude=pickup_lon,
            dropoff_latitude=dropoff_lat,
            dropoff_longitude=dropoff_lon,
            pickup_datetime=pickup_datetime,
            passenger_count=passenger_count,
            validate_bounds=False,  # Already validated with custom Vietnamese messages
        )

        duration_sec = float(res["duration_seconds"])
        duration_min = float(res["duration_minutes"])
        distance_km = float(res.get("distance_km", round(haversine_distance_meters(pickup_lon, pickup_lat, dropoff_lon, dropoff_lat) / 1000.0, 2)))

        return {
            "duration_seconds": round(duration_sec, 1),
            "duration_minutes": round(duration_min, 1),
            "distance_km": distance_km,
            "label": res.get("label", "Thời gian dự kiến"),
            "model_name": self.model_name,
            "historical_disclaimer": (
                "Dữ liệu chuyến đi thực tế từ NYC Taxi (Manhattan). "
                "Kết quả được dự báo bằng mô hình học máy dựa trên thời gian và tọa độ trong quá khứ."
            ),
        }


# Singleton service instance
ml_service = MLService()
