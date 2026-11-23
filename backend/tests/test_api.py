"""Comprehensive tests for NYC Taxi API endpoints."""

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)

# Sample valid Manhattan coordinates
TIMES_SQUARE = {"lat": 40.7580, "lon": -73.9855}
WALL_STREET = {"lat": 40.7071, "lon": -74.0110}
CENTRAL_PARK_SOUTH = {"lat": 40.7660, "lon": -73.9772}
GRAND_CENTRAL = {"lat": 40.7527, "lon": -73.9772}
EMPIRE_STATE = {"lat": 40.7484, "lon": -73.9857}
SOHO = {"lat": 40.7233, "lon": -74.0030}

# Sample out-of-bounds coordinates (Brooklyn / Queens / New Jersey)
BROOKLYN_OUT = {"lat": 40.6500, "lon": -73.9500}
QUEENS_OUT = {"lat": 40.7500, "lon": -73.8000}
NJ_OUT = {"lat": 40.7300, "lon": -74.1500}


# ============================================================================
# 1. Health & Ready Endpoints
# ============================================================================

def test_health_endpoint():
    """Verify GET /api/health returns 200 OK and valid status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "NYC Taxi" in data["app"]


def test_ready_endpoint():
    """Verify GET /api/ready returns 200 OK."""
    response = client.get("/api/ready")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "ml_model_loaded" in data
    assert "manhattan_graph_loaded" in data


# ============================================================================
# 2. Predict Endpoint
# ============================================================================

def test_predict_valid_request():
    """Verify POST /api/predict works with valid Manhattan coordinates."""
    payload = {
        "pickup_lon": TIMES_SQUARE["lon"],
        "pickup_lat": TIMES_SQUARE["lat"],
        "dropoff_lon": WALL_STREET["lon"],
        "dropoff_lat": WALL_STREET["lat"],
        "passenger_count": 2,
        "pickup_datetime": "2026-11-20 18:30:00",
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "duration_seconds" in data
    assert "duration_minutes" in data
    assert data["duration_seconds"] > 0
    assert data["duration_minutes"] > 0
    assert data["label"] == "Thời gian dự kiến"
    assert "distance_km" in data


def test_predict_out_of_bounds_pickup():
    """Verify POST /api/predict rejects pickup outside Manhattan with Vietnamese error."""
    payload = {
        "pickup_lon": BROOKLYN_OUT["lon"],
        "pickup_lat": BROOKLYN_OUT["lat"],
        "dropoff_lon": WALL_STREET["lon"],
        "dropoff_lat": WALL_STREET["lat"],
        "passenger_count": 1,
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "Điểm đón nằm ngoài Manhattan" in detail


def test_predict_out_of_bounds_dropoff():
    """Verify POST /api/predict rejects dropoff outside Manhattan with Vietnamese error."""
    payload = {
        "pickup_lon": TIMES_SQUARE["lon"],
        "pickup_lat": TIMES_SQUARE["lat"],
        "dropoff_lon": QUEENS_OUT["lon"],
        "dropoff_lat": QUEENS_OUT["lat"],
        "passenger_count": 1,
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "Điểm trả nằm ngoài Manhattan" in detail


def test_predict_identical_coordinates():
    """Verify POST /api/predict rejects identical pickup and dropoff points."""
    payload = {
        "pickup_lon": TIMES_SQUARE["lon"],
        "pickup_lat": TIMES_SQUARE["lat"],
        "dropoff_lon": TIMES_SQUARE["lon"],
        "dropoff_lat": TIMES_SQUARE["lat"],
        "passenger_count": 1,
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "Điểm đón và điểm trả trùng nhau" in detail


def test_predict_invalid_passenger_count():
    """Verify POST /api/predict rejects passenger count outside 1-6 range."""
    # Test passenger_count = 0
    payload_zero = {
        "pickup_lon": TIMES_SQUARE["lon"],
        "pickup_lat": TIMES_SQUARE["lat"],
        "dropoff_lon": WALL_STREET["lon"],
        "dropoff_lat": WALL_STREET["lat"],
        "passenger_count": 0,
    }
    response = client.post("/api/predict", json=payload_zero)
    assert response.status_code == 400
    assert "Số hành khách phải từ 1 đến 6" in response.json()["detail"]

    # Test passenger_count = 7
    payload_seven = {
        "pickup_lon": TIMES_SQUARE["lon"],
        "pickup_lat": TIMES_SQUARE["lat"],
        "dropoff_lon": WALL_STREET["lon"],
        "dropoff_lat": WALL_STREET["lat"],
        "passenger_count": 7,
    }
    response = client.post("/api/predict", json=payload_seven)
    assert response.status_code == 400
    assert "Số hành khách phải từ 1 đến 6" in response.json()["detail"]


# ============================================================================
# 3. Route Endpoint
# ============================================================================

def test_route_valid_request():
    """Verify POST /api/route returns shortest path with GeoJSON coordinates."""
    payload = {
        "pickup_lon": TIMES_SQUARE["lon"],
        "pickup_lat": TIMES_SQUARE["lat"],
        "dropoff_lon": GRAND_CENTRAL["lon"],
        "dropoff_lat": GRAND_CENTRAL["lat"],
    }
    response = client.post("/api/route", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["distance_meters"] > 0
    assert data["duration_seconds"] > 0
    assert data["label"] == "Tuyến ngắn nhất theo quãng đường"
    assert "geojson" in data
    assert data["geojson"]["type"] == "LineString"
    assert len(data["geojson"]["coordinates"]) >= 2
    # Verify coordinates format [[lon, lat], ...]
    first_coord = data["geojson"]["coordinates"][0]
    assert len(first_coord) == 2
    assert -74.05 <= first_coord[0] <= -73.90  # lon
    assert 40.69 <= first_coord[1] <= 40.88   # lat


def test_route_out_of_bounds():
    """Verify POST /api/route rejects out-of-bounds coordinates."""
    payload = {
        "pickup_lon": NJ_OUT["lon"],
        "pickup_lat": NJ_OUT["lat"],
        "dropoff_lon": GRAND_CENTRAL["lon"],
        "dropoff_lat": GRAND_CENTRAL["lat"],
    }
    response = client.post("/api/route", json=payload)
    assert response.status_code == 400
    assert "Điểm đón nằm ngoài Manhattan" in response.json()["detail"]


def test_route_identical_coordinates():
    """Verify POST /api/route rejects identical coordinates."""
    payload = {
        "pickup_lon": GRAND_CENTRAL["lon"],
        "pickup_lat": GRAND_CENTRAL["lat"],
        "dropoff_lon": GRAND_CENTRAL["lon"],
        "dropoff_lat": GRAND_CENTRAL["lat"],
    }
    response = client.post("/api/route", json=payload)
    assert response.status_code == 400
    assert "Điểm đón và điểm trả trùng nhau" in response.json()["detail"]


# ============================================================================
# 4. Dispatch Endpoint
# ============================================================================

def test_dispatch_valid_three_requests():
    """Verify POST /api/dispatch with 3 requests and capacity 4."""
    payload = {
        "start_lon": TIMES_SQUARE["lon"],
        "start_lat": TIMES_SQUARE["lat"],
        "capacity": 4,
        "requests": [
            {
                "id": 1,
                "name": "Khách A",
                "pickup_lon": TIMES_SQUARE["lon"],
                "pickup_lat": TIMES_SQUARE["lat"],
                "dropoff_lon": WALL_STREET["lon"],
                "dropoff_lat": WALL_STREET["lat"],
                "passengers": 1,
            },
            {
                "id": 2,
                "name": "Khách B",
                "pickup_lon": GRAND_CENTRAL["lon"],
                "pickup_lat": GRAND_CENTRAL["lat"],
                "dropoff_lon": SOHO["lon"],
                "dropoff_lat": SOHO["lat"],
                "passengers": 1,
            },
            {
                "id": 3,
                "name": "Khách C",
                "pickup_lon": EMPIRE_STATE["lon"],
                "pickup_lat": EMPIRE_STATE["lat"],
                "dropoff_lon": CENTRAL_PARK_SOUTH["lon"],
                "dropoff_lat": CENTRAL_PARK_SOUTH["lat"],
                "passengers": 1,
            },
        ],
    }
    response = client.post("/api/dispatch", json=payload)
    assert response.status_code == 200
    data = response.json()

    # 3 requests = 6 stops (3 pickups + 3 dropoffs)
    assert len(data["stops"]) == 6
    assert len(data["vehicle_load"]) == 6
    # Load should never exceed capacity 4
    for load in data["vehicle_load"]:
        assert 0 <= load <= 4

    assert data["total_duration_seconds"] > 0
    assert data["total_distance_meters"] > 0
    assert "sequential_baseline" in data
    assert data["sequential_duration_seconds"] > 0
    assert "savings_seconds" in data
    assert "route_legs" in data
    assert len(data["route_legs"]) == 6


def test_dispatch_capacity_violation():
    """Verify POST /api/dispatch rejects requests exceeding vehicle capacity."""
    payload = {
        "start_lon": TIMES_SQUARE["lon"],
        "start_lat": TIMES_SQUARE["lat"],
        "capacity": 2,  # Vehicle capacity is 2
        "requests": [
            {
                "id": 1,
                "name": "Nhóm đông người",
                "pickup_lon": TIMES_SQUARE["lon"],
                "pickup_lat": TIMES_SQUARE["lat"],
                "dropoff_lon": WALL_STREET["lon"],
                "dropoff_lat": WALL_STREET["lat"],
                "passengers": 3,  # 3 passengers exceeds capacity 2
            }
        ],
    }
    response = client.post("/api/dispatch", json=payload)
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "vượt quá sức chứa" in detail or "Sức chứa xe" in detail


def test_dispatch_invalid_capacity():
    """Verify POST /api/dispatch rejects negative or zero capacity."""
    payload = {
        "start_lon": TIMES_SQUARE["lon"],
        "start_lat": TIMES_SQUARE["lat"],
        "capacity": 0,
        "requests": [
            {
                "id": 1,
                "name": "Khách 1",
                "pickup_lon": TIMES_SQUARE["lon"],
                "pickup_lat": TIMES_SQUARE["lat"],
                "dropoff_lon": WALL_STREET["lon"],
                "dropoff_lat": WALL_STREET["lat"],
                "passengers": 1,
            }
        ],
    }
    response = client.post("/api/dispatch", json=payload)
    assert response.status_code == 400
    assert "Sức chứa xe không hợp lệ hoặc không đủ" in response.json()["detail"]


def test_dispatch_out_of_bounds_coordinates():
    """Verify POST /api/dispatch rejects requests with out-of-bounds coordinates."""
    payload = {
        "start_lon": TIMES_SQUARE["lon"],
        "start_lat": TIMES_SQUARE["lat"],
        "capacity": 4,
        "requests": [
            {
                "id": 1,
                "name": "Khách đi xa",
                "pickup_lon": BROOKLYN_OUT["lon"],
                "pickup_lat": BROOKLYN_OUT["lat"],
                "dropoff_lon": WALL_STREET["lon"],
                "dropoff_lat": WALL_STREET["lat"],
                "passengers": 1,
            }
        ],
    }
    response = client.post("/api/dispatch", json=payload)
    assert response.status_code == 400
    assert "nằm ngoài Manhattan" in response.json()["detail"]


def test_dispatch_one_request():
    """Verify POST /api/dispatch works with exactly 1 request."""
    payload = {
        "start_lon": TIMES_SQUARE["lon"],
        "start_lat": TIMES_SQUARE["lat"],
        "capacity": 4,
        "requests": [
            {
                "id": 1,
                "name": "Khách Đơn",
                "pickup_lon": TIMES_SQUARE["lon"],
                "pickup_lat": TIMES_SQUARE["lat"],
                "dropoff_lon": WALL_STREET["lon"],
                "dropoff_lat": WALL_STREET["lat"],
                "passengers": 1,
            }
        ],
    }
    response = client.post("/api/dispatch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["stops"]) == 2  # 1 pickup, 1 dropoff
    assert data["total_duration_seconds"] > 0
    assert len(data["vehicle_load"]) == 2


def test_dispatch_two_requests():
    """Verify POST /api/dispatch works with 2 requests."""
    payload = {
        "start_lon": TIMES_SQUARE["lon"],
        "start_lat": TIMES_SQUARE["lat"],
        "capacity": 4,
        "requests": [
            {
                "id": 1,
                "name": "Khách 1",
                "pickup_lon": TIMES_SQUARE["lon"],
                "pickup_lat": TIMES_SQUARE["lat"],
                "dropoff_lon": GRAND_CENTRAL["lon"],
                "dropoff_lat": GRAND_CENTRAL["lat"],
                "passengers": 1,
            },
            {
                "id": 2,
                "name": "Khách 2",
                "pickup_lon": EMPIRE_STATE["lon"],
                "pickup_lat": EMPIRE_STATE["lat"],
                "dropoff_lon": SOHO["lon"],
                "dropoff_lat": SOHO["lat"],
                "passengers": 2,
            },
        ],
    }
    response = client.post("/api/dispatch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["stops"]) == 4  # 2 pickups + 2 dropoffs
    for load in data["vehicle_load"]:
        assert 0 <= load <= 4


def test_dispatch_four_requests_max():
    """Verify POST /api/dispatch works with maximum 4 requests."""
    payload = {
        "start_lon": TIMES_SQUARE["lon"],
        "start_lat": TIMES_SQUARE["lat"],
        "capacity": 4,
        "requests": [
            {
                "id": 1,
                "name": "Khách 1",
                "pickup_lon": TIMES_SQUARE["lon"],
                "pickup_lat": TIMES_SQUARE["lat"],
                "dropoff_lon": WALL_STREET["lon"],
                "dropoff_lat": WALL_STREET["lat"],
                "passengers": 1,
            },
            {
                "id": 2,
                "name": "Khách 2",
                "pickup_lon": GRAND_CENTRAL["lon"],
                "pickup_lat": GRAND_CENTRAL["lat"],
                "dropoff_lon": SOHO["lon"],
                "dropoff_lat": SOHO["lat"],
                "passengers": 1,
            },
            {
                "id": 3,
                "name": "Khách 3",
                "pickup_lon": EMPIRE_STATE["lon"],
                "pickup_lat": EMPIRE_STATE["lat"],
                "dropoff_lon": CENTRAL_PARK_SOUTH["lon"],
                "dropoff_lat": CENTRAL_PARK_SOUTH["lat"],
                "passengers": 1,
            },
            {
                "id": 4,
                "name": "Khách 4",
                "pickup_lon": CENTRAL_PARK_SOUTH["lon"],
                "pickup_lat": CENTRAL_PARK_SOUTH["lat"],
                "dropoff_lon": SOHO["lon"],
                "dropoff_lat": SOHO["lat"],
                "passengers": 1,
            },
        ],
    }
    response = client.post("/api/dispatch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["stops"]) == 8  # 4 pickups + 4 dropoffs
    for load in data["vehicle_load"]:
        assert 0 <= load <= 4


def test_dispatch_more_than_four_requests_rejected():
    """Verify POST /api/dispatch rejects > 4 requests with clear Vietnamese message."""
    payload = {
        "start_lon": TIMES_SQUARE["lon"],
        "start_lat": TIMES_SQUARE["lat"],
        "capacity": 4,
        "requests": [
            {"id": i, "name": f"Khách {i}", "pickup_lon": TIMES_SQUARE["lon"], "pickup_lat": TIMES_SQUARE["lat"], "dropoff_lon": WALL_STREET["lon"], "dropoff_lat": WALL_STREET["lat"], "passengers": 1}
            for i in range(1, 6)  # 5 requests
        ],
    }
    response = client.post("/api/dispatch", json=payload)
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "Hệ thống hỗ trợ tối đa 4 yêu cầu đón trả đồng thời để đảm bảo thời gian phản hồi tức thì." in detail


def test_route_distance_and_snapping_metrics():
    """Verify POST /api/route returns graph_distance_meters and snapping metrics."""
    payload = {
        "pickup_lon": TIMES_SQUARE["lon"],
        "pickup_lat": TIMES_SQUARE["lat"],
        "dropoff_lon": GRAND_CENTRAL["lon"],
        "dropoff_lat": GRAND_CENTRAL["lat"],
    }
    response = client.post("/api/route", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "distance_meters" in data
    assert "graph_distance_meters" in data
    assert "snapping_distance_meters" in data
    assert data["distance_meters"] >= data["graph_distance_meters"]


def test_predict_timezone_handling_new_york():
    """Verify POST /api/predict handles pickup_datetime with timezone conversion."""
    # 18:00 Vietnam time (UTC+7) -> 06:00 New York time (UTC-5)
    payload = {
        "pickup_lon": TIMES_SQUARE["lon"],
        "pickup_lat": TIMES_SQUARE["lat"],
        "dropoff_lon": WALL_STREET["lon"],
        "dropoff_lat": WALL_STREET["lat"],
        "passenger_count": 1,
        "pickup_datetime": "2026-11-21T18:00:00+07:00",
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["duration_seconds"] > 0
