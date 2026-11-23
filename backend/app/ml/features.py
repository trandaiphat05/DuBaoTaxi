"""
NYC Taxi Duration Prediction - Feature Engineering Module
"""
import numpy as np
import pandas as pd
from typing import Union, Dict, Any, List, Optional
from datetime import datetime

# Manhattan bounding box limits
BOUNDING_BOX = {
    "min_lon": -74.05,
    "max_lon": -73.90,
    "min_lat": 40.69,
    "max_lat": 40.88,
}

FEATURE_COLUMNS = [
    "pickup_longitude",
    "pickup_latitude",
    "dropoff_longitude",
    "dropoff_latitude",
    "passenger_count",
    "pickup_hour",
    "pickup_dayofweek",
    "pickup_month",
    "is_weekend",
    "is_rush_hour",
    "haversine_distance_km",
    "manhattan_distance_km",
    "bearing_degrees",
    "abs_lat_diff",
    "abs_lon_diff",
    "center_latitude",
    "center_longitude",
]


def haversine_distance_km(
    lat1: Union[float, np.ndarray, pd.Series],
    lon1: Union[float, np.ndarray, pd.Series],
    lat2: Union[float, np.ndarray, pd.Series],
    lon2: Union[float, np.ndarray, pd.Series],
) -> Union[float, np.ndarray, pd.Series]:
    """Calculate the great circle distance between two points on the earth in km."""
    R = 6371.0  # Earth radius in kilometers
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    a = (
        np.sin(dlat / 2.0) ** 2
        + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon / 2.0) ** 2
    )
    a = np.clip(a, 0.0, 1.0)
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return R * c


def manhattan_distance_km(
    lat1: Union[float, np.ndarray, pd.Series],
    lon1: Union[float, np.ndarray, pd.Series],
    lat2: Union[float, np.ndarray, pd.Series],
    lon2: Union[float, np.ndarray, pd.Series],
) -> Union[float, np.ndarray, pd.Series]:
    """
    Calculate Manhattan (L1) distance in km approximating street grid travel.
    1 degree latitude ~ 111.0 km; 1 degree longitude ~ 111.0 * cos(lat) km.
    """
    lat_dist = np.abs(lat2 - lat1) * 111.0
    mid_lat = np.radians((lat1 + lat2) / 2.0)
    lon_dist = np.abs(lon2 - lon1) * (111.0 * np.cos(mid_lat))
    return lat_dist + lon_dist


def calculate_bearing_degrees(
    lat1: Union[float, np.ndarray, pd.Series],
    lon1: Union[float, np.ndarray, pd.Series],
    lat2: Union[float, np.ndarray, pd.Series],
    lon2: Union[float, np.ndarray, pd.Series],
) -> Union[float, np.ndarray, pd.Series]:
    """Calculate initial compass bearing from start point to end point in degrees (0-360)."""
    lat1_r = np.radians(lat1)
    lat2_r = np.radians(lat2)
    dlon_r = np.radians(lon2 - lon1)

    x = np.sin(dlon_r) * np.cos(lat2_r)
    y = np.cos(lat1_r) * np.sin(lat2_r) - np.sin(lat1_r) * np.cos(lat2_r) * np.cos(dlon_r)
    initial_bearing = np.degrees(np.arctan2(x, y))
    return (initial_bearing + 360.0) % 360.0


def extract_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Extract engineered features from raw input DataFrame.
    Expected columns:
      - pickup_longitude, pickup_latitude
      - dropoff_longitude, dropoff_latitude
      - passenger_count (optional, default 1)
      - pickup_datetime (optional, default now)
    """
    df_out = pd.DataFrame(index=df.index)

    # Coordinates
    lat1 = df["pickup_latitude"].astype(float)
    lon1 = df["pickup_longitude"].astype(float)
    lat2 = df["dropoff_latitude"].astype(float)
    lon2 = df["dropoff_longitude"].astype(float)

    df_out["pickup_longitude"] = lon1
    df_out["pickup_latitude"] = lat1
    df_out["dropoff_longitude"] = lon2
    df_out["dropoff_latitude"] = lat2

    # Passenger count
    if "passenger_count" in df.columns:
        df_out["passenger_count"] = df["passenger_count"].fillna(1).astype(int).clip(1, 6)
    else:
        df_out["passenger_count"] = 1

    # Temporal features (guarantee America/New_York EDT/EST conversion)
    if "pickup_datetime" in df.columns:
        dt = pd.to_datetime(df["pickup_datetime"], errors="coerce")
        if dt.isna().any():
            dt = dt.fillna(pd.Timestamp.now(tz="America/New_York"))
    else:
        dt = pd.Series(pd.Timestamp.now(tz="America/New_York"), index=df.index)

    # If timezone-aware (e.g. ISO string with offset like +07:00 or UTC Z), convert to New York time
    try:
        if getattr(dt.dt, "tz", None) is not None:
            dt = dt.dt.tz_convert("America/New_York")
    except Exception:
        pass

    df_out["pickup_hour"] = dt.dt.hour
    df_out["pickup_dayofweek"] = dt.dt.day_of_week if hasattr(dt.dt, "day_of_week") else dt.dt.dayofweek
    df_out["pickup_month"] = dt.dt.month
    df_out["is_weekend"] = (df_out["pickup_dayofweek"] >= 5).astype(int)

    # NYC rush hour: 7-10am or 4-7pm (16-19) on weekdays
    is_weekday = df_out["is_weekend"] == 0
    is_morning_rush = df_out["pickup_hour"].between(7, 10)
    is_evening_rush = df_out["pickup_hour"].between(16, 19)
    df_out["is_rush_hour"] = (is_weekday & (is_morning_rush | is_evening_rush)).astype(int)

    # Distance & geometry features
    df_out["haversine_distance_km"] = haversine_distance_km(lat1, lon1, lat2, lon2)
    df_out["manhattan_distance_km"] = manhattan_distance_km(lat1, lon1, lat2, lon2)
    df_out["bearing_degrees"] = calculate_bearing_degrees(lat1, lon1, lat2, lon2)
    df_out["abs_lat_diff"] = np.abs(lat2 - lat1)
    df_out["abs_lon_diff"] = np.abs(lon2 - lon1)
    df_out["center_latitude"] = (lat1 + lat2) / 2.0
    df_out["center_longitude"] = (lon1 + lon2) / 2.0

    return df_out[FEATURE_COLUMNS]


def is_in_bounding_box(lat: float, lon: float) -> bool:
    """Check if a coordinate pair falls within the Manhattan bounding box."""
    return (
        BOUNDING_BOX["min_lat"] <= lat <= BOUNDING_BOX["max_lat"]
        and BOUNDING_BOX["min_lon"] <= lon <= BOUNDING_BOX["max_lon"]
    )


class TaxiDurationPipeline:
    """
    Serializable ML Pipeline wrapper for NYC Taxi Trip Duration prediction.
    Encapsulates feature engineering, target exponentiation, and validation.
    """

    def __init__(self, regressor: Any, feature_columns: Optional[List[str]] = None, metadata: Optional[Dict[str, Any]] = None):
        self.regressor = regressor
        self.feature_columns = feature_columns or FEATURE_COLUMNS
        self.metadata = metadata or {}

    def predict(self, X: Union[pd.DataFrame, np.ndarray, Dict[str, Any], List[Dict[str, Any]]]) -> np.ndarray:
        """
        Predict trip duration in seconds for given inputs.
        Accepts DataFrame, list of dicts, single dict, or 2D feature array.
        """
        if isinstance(X, dict):
            X = pd.DataFrame([X])
        elif isinstance(X, list) and len(X) > 0 and isinstance(X[0], dict):
            X = pd.DataFrame(X)

        if isinstance(X, pd.DataFrame):
            if "pickup_latitude" in X.columns and "pickup_longitude" in X.columns:
                X_feat = extract_features(X)
            else:
                X_feat = X[self.feature_columns]
            log_pred = self.regressor.predict(X_feat)
        else:
            if hasattr(self.regressor, "feature_names_in_"):
                X_feat = pd.DataFrame(X, columns=self.regressor.feature_names_in_)
                log_pred = self.regressor.predict(X_feat)
            else:
                log_pred = self.regressor.predict(X)

        # Predict log(1 + trip_duration) then invert
        pred_seconds = np.clip(np.expm1(log_pred), 60.0, 7200.0)
        return pred_seconds

    def predict_trip(
        self,
        pickup_latitude: float,
        pickup_longitude: float,
        dropoff_latitude: float,
        dropoff_longitude: float,
        pickup_datetime: Optional[Any] = None,
        passenger_count: int = 1,
    ) -> Dict[str, Any]:
        """
        Convenience method to predict duration for a single trip.
        Returns duration in seconds and minutes along with standard label.
        """
        if pickup_datetime is None:
            pickup_datetime = datetime.now().isoformat()

        row = {
            "pickup_latitude": float(pickup_latitude),
            "pickup_longitude": float(pickup_longitude),
            "dropoff_latitude": float(dropoff_latitude),
            "dropoff_longitude": float(dropoff_longitude),
            "passenger_count": int(passenger_count),
            "pickup_datetime": str(pickup_datetime),
        }
        pred_seconds = float(self.predict(row)[0])
        dist_km = float(haversine_distance_km(
            row["pickup_latitude"], row["pickup_longitude"],
            row["dropoff_latitude"], row["dropoff_longitude"]
        ))

        return {
            "duration_seconds": round(pred_seconds, 1),
            "duration_minutes": round(pred_seconds / 60.0, 2),
            "distance_km": round(dist_km, 2),
            "label": "Thời gian dự kiến",
        }
