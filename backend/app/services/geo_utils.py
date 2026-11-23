"""Geographic utilities and coordinate validation for Manhattan."""

import math
from typing import Tuple

# Manhattan Bounding Box coordinates
# Longitude: -74.05 to -73.90
# Latitude: 40.69 to 40.88
MANHATTAN_BBOX = {
    "min_lon": -74.05,
    "max_lon": -73.90,
    "min_lat": 40.69,
    "max_lat": 40.88,
}


def is_in_manhattan(lon: float, lat: float) -> bool:
    """Check if a coordinate (lon, lat) is within the Manhattan bounding box."""
    return (
        MANHATTAN_BBOX["min_lon"] <= lon <= MANHATTAN_BBOX["max_lon"]
        and MANHATTAN_BBOX["min_lat"] <= lat <= MANHATTAN_BBOX["max_lat"]
    )


def validate_point_in_manhattan(lon: float, lat: float, point_label: str = "Tọa độ") -> None:
    """Validate that a point is in Manhattan with appropriate Vietnamese error message."""
    if not is_in_manhattan(lon, lat):
        if "đón" in point_label.lower():
            raise ValueError("Điểm đón nằm ngoài Manhattan. Hãy chọn lại trên bản đồ.")
        elif "trả" in point_label.lower():
            raise ValueError("Điểm trả nằm ngoài Manhattan. Hãy chọn lại trên bản đồ.")
        elif "xe" in point_label.lower() or "xuất phát" in point_label.lower():
            raise ValueError("Vị trí xe xuất phát nằm ngoài Manhattan.")
        else:
            raise ValueError(f"{point_label} nằm ngoài Manhattan. Hãy chọn lại trên bản đồ.")


def validate_trip_coordinates(
    pickup_lon: float,
    pickup_lat: float,
    dropoff_lon: float,
    dropoff_lat: float,
) -> None:
    """Validate pickup and dropoff points for taxi trip."""
    if not is_in_manhattan(pickup_lon, pickup_lat):
        raise ValueError("Điểm đón nằm ngoài Manhattan. Hãy chọn lại trên bản đồ.")
    if not is_in_manhattan(dropoff_lon, dropoff_lat):
        raise ValueError("Điểm trả nằm ngoài Manhattan. Hãy chọn lại trên bản đồ.")

    # Check identical coords (within ~1 meter)
    if abs(pickup_lon - dropoff_lon) < 1e-5 and abs(pickup_lat - dropoff_lat) < 1e-5:
        raise ValueError("Điểm đón và điểm trả trùng nhau.")


def validate_passenger_count(count: int) -> None:
    """Validate passenger count is between 1 and 6."""
    if count is None or count < 1 or count > 6:
        raise ValueError("Số hành khách phải từ 1 đến 6.")


def validate_capacity(capacity: int) -> None:
    """Validate vehicle capacity is at least 1."""
    if capacity is None or capacity < 1:
        raise ValueError("Sức chứa xe không hợp lệ hoặc không đủ.")


def haversine_distance_meters(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Calculate the great-circle distance between two points in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def manhattan_distance_meters(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """
    Calculate Manhattan L1 distance rotated along NYC grid (avenues ~29 deg east of north).
    """
    # NYC Manhattan street grid angle approx 29 degrees
    theta = math.radians(29.0)
    cos_t = math.cos(theta)
    sin_t = math.sin(theta)

    # Convert approx degree diff to meters
    # At latitude 40.75:
    m_per_deg_lat = 111000.0
    m_per_deg_lon = 111000.0 * math.cos(math.radians(40.75))

    dx = (lon2 - lon1) * m_per_deg_lon
    dy = (lat2 - lat1) * m_per_deg_lat

    # Rotate coordinates to align with avenues & streets
    u = dx * cos_t + dy * sin_t
    v = -dx * sin_t + dy * cos_t

    return abs(u) + abs(v)
