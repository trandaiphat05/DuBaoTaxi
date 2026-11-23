"""Pydantic schemas for API request and response validation."""

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, model_validator


class CoordinateModel(BaseModel):
    lat: float
    lon: float


class PredictionRequest(BaseModel):
    pickup_lat: Optional[float] = Field(None, description="Pickup latitude")
    pickup_lon: Optional[float] = Field(None, description="Pickup longitude")
    dropoff_lat: Optional[float] = Field(None, description="Dropoff latitude")
    dropoff_lon: Optional[float] = Field(None, description="Dropoff longitude")

    # Long name aliases
    pickup_latitude: Optional[float] = Field(None, description="Pickup latitude alias")
    pickup_longitude: Optional[float] = Field(None, description="Pickup longitude alias")
    dropoff_latitude: Optional[float] = Field(None, description="Dropoff latitude alias")
    dropoff_longitude: Optional[float] = Field(None, description="Dropoff longitude alias")

    passenger_count: Optional[int] = Field(1, description="Number of passengers (1-6)")
    passengers: Optional[int] = Field(None, description="Alias for passenger count")
    pickup_datetime: Optional[str] = Field(None, description="Pickup datetime string")

    @model_validator(mode="after")
    def unify_coordinates(self):
        if self.pickup_lat is None and self.pickup_latitude is not None:
            self.pickup_lat = self.pickup_latitude
        if self.pickup_lon is None and self.pickup_longitude is not None:
            self.pickup_lon = self.pickup_longitude
        if self.dropoff_lat is None and self.dropoff_latitude is not None:
            self.dropoff_lat = self.dropoff_latitude
        if self.dropoff_lon is None and self.dropoff_longitude is not None:
            self.dropoff_lon = self.dropoff_longitude

        if self.passenger_count is None and self.passengers is not None:
            self.passenger_count = self.passengers

        if None in (self.pickup_lat, self.pickup_lon, self.dropoff_lat, self.dropoff_lon):
            raise ValueError("Tọa độ đón và trả không được để trống.")
        return self


class PredictionResponse(BaseModel):
    duration_seconds: float
    duration_minutes: float
    distance_km: Optional[float] = None
    label: str = "Thời gian dự kiến"
    model_name: Optional[str] = None
    historical_disclaimer: Optional[str] = None


class RoutingRequest(BaseModel):
    pickup_lat: Optional[float] = None
    pickup_lon: Optional[float] = None
    dropoff_lat: Optional[float] = None
    dropoff_lon: Optional[float] = None

    pickup_latitude: Optional[float] = None
    pickup_longitude: Optional[float] = None
    dropoff_latitude: Optional[float] = None
    dropoff_longitude: Optional[float] = None

    @model_validator(mode="after")
    def unify_coordinates(self):
        if self.pickup_lat is None and self.pickup_latitude is not None:
            self.pickup_lat = self.pickup_latitude
        if self.pickup_lon is None and self.pickup_longitude is not None:
            self.pickup_lon = self.pickup_longitude
        if self.dropoff_lat is None and self.dropoff_latitude is not None:
            self.dropoff_lat = self.dropoff_latitude
        if self.dropoff_lon is None and self.dropoff_longitude is not None:
            self.dropoff_lon = self.dropoff_longitude

        if None in (self.pickup_lat, self.pickup_lon, self.dropoff_lat, self.dropoff_lon):
            raise ValueError("Tọa độ đón và trả không được để trống.")
        return self


class GeoJSONLineString(BaseModel):
    type: str = "LineString"
    coordinates: List[List[float]]


class RoutingResponse(BaseModel):
    distance_meters: float
    distance_km: Optional[float] = None
    graph_distance_meters: Optional[float] = None
    source_snapping_distance_meters: Optional[float] = None
    target_snapping_distance_meters: Optional[float] = None
    snapping_distance_meters: Optional[float] = None
    duration_seconds: float
    duration_minutes: float
    geojson: GeoJSONLineString
    coordinates: Optional[List[List[float]]] = None
    label: str = "Tuyến ngắn nhất theo quãng đường"
    visited_nodes: Optional[int] = None
    execution_time_ms: Optional[float] = None


class PassengerRequestItem(BaseModel):
    id: Optional[Union[int, str]] = 1
    name: Optional[str] = None
    pickup_lat: Optional[float] = None
    pickup_lon: Optional[float] = None
    pickup_latitude: Optional[float] = None
    pickup_longitude: Optional[float] = None
    dropoff_lat: Optional[float] = None
    dropoff_lon: Optional[float] = None
    dropoff_latitude: Optional[float] = None
    dropoff_longitude: Optional[float] = None
    passengers: Optional[int] = None
    passenger_count: Optional[int] = None
    pickup: Optional[Union[Dict[str, float], List[float]]] = None
    dropoff: Optional[Union[Dict[str, float], List[float]]] = None

    @model_validator(mode="after")
    def resolve_item(self):
        # Resolve pickup
        if self.pickup is not None:
            if isinstance(self.pickup, dict):
                self.pickup_lat = self.pickup.get("lat") or self.pickup.get("latitude")
                self.pickup_lon = self.pickup.get("lon") or self.pickup.get("longitude")
            elif isinstance(self.pickup, (list, tuple)) and len(self.pickup) >= 2:
                # Lon, Lat or Lat, Lon check
                self.pickup_lon = float(self.pickup[0])
                self.pickup_lat = float(self.pickup[1])

        if self.pickup_lat is None and self.pickup_latitude is not None:
            self.pickup_lat = self.pickup_latitude
        if self.pickup_lon is None and self.pickup_longitude is not None:
            self.pickup_lon = self.pickup_longitude

        # Resolve dropoff
        if self.dropoff is not None:
            if isinstance(self.dropoff, dict):
                self.dropoff_lat = self.dropoff.get("lat") or self.dropoff.get("latitude")
                self.dropoff_lon = self.dropoff.get("lon") or self.dropoff.get("longitude")
            elif isinstance(self.dropoff, (list, tuple)) and len(self.dropoff) >= 2:
                self.dropoff_lon = float(self.dropoff[0])
                self.dropoff_lat = float(self.dropoff[1])

        if self.dropoff_lat is None and self.dropoff_latitude is not None:
            self.dropoff_lat = self.dropoff_latitude
        if self.dropoff_lon is None and self.dropoff_longitude is not None:
            self.dropoff_lon = self.dropoff_longitude

        # Resolve passenger count
        if self.passengers is None and self.passenger_count is not None:
            self.passengers = self.passenger_count
        elif self.passengers is None:
            self.passengers = 1

        if self.name is None:
            self.name = f"Khách {self.id}"

        return self


class DispatchRequest(BaseModel):
    start_lat: Optional[float] = None
    start_lon: Optional[float] = None
    start_latitude: Optional[float] = None
    start_longitude: Optional[float] = None
    start_location: Optional[Union[Dict[str, float], List[float]]] = None
    capacity: int = 4
    requests: List[PassengerRequestItem]

    @model_validator(mode="after")
    def resolve_start(self):
        if not self.requests or len(self.requests) < 1:
            raise ValueError("Danh sách yêu cầu chuyến đi không được để trống.")
        if len(self.requests) > 4:
            raise ValueError("Hệ thống hỗ trợ tối đa 4 yêu cầu đón trả đồng thời để đảm bảo thời gian phản hồi tức thì.")

        if self.start_location is not None:
            if isinstance(self.start_location, dict):
                self.start_lat = self.start_location.get("lat") or self.start_location.get("latitude")
                self.start_lon = self.start_location.get("lon") or self.start_location.get("longitude")
            elif isinstance(self.start_location, (list, tuple)) and len(self.start_location) >= 2:
                self.start_lon = float(self.start_location[0])
                self.start_lat = float(self.start_location[1])

        if self.start_lat is None and self.start_latitude is not None:
            self.start_lat = self.start_latitude
        if self.start_lon is None and self.start_longitude is not None:
            self.start_lon = self.start_longitude

        # Default start to first request's pickup if not explicitly provided
        if self.start_lat is None or self.start_lon is None:
            if self.requests and len(self.requests) > 0:
                first = self.requests[0]
                self.start_lat = first.pickup_lat
                self.start_lon = first.pickup_lon
            else:
                raise ValueError("Vị trí xe xuất phát không được để trống.")
        return self


class DispatchStopItem(BaseModel):
    step: int
    event: str
    request_id: Optional[Union[int, str]] = None
    passenger_name: Optional[str] = None
    location: List[float]
    load: int
    vehicle_load: int
    cumulative_duration_seconds: float
    cumulative_distance_meters: Optional[float] = None
    label: str


class SequentialBaselineItem(BaseModel):
    total_distance_meters: float
    total_duration_seconds: float
    total_duration_minutes: float
    distance_saved_meters: Optional[float] = None
    duration_saved_seconds: Optional[float] = None
    saving_percentage: Optional[float] = None


class DispatchResponse(BaseModel):
    stops: List[DispatchStopItem]
    vehicle_load: List[int]
    total_distance_meters: float
    total_duration_seconds: float
    total_duration_minutes: float
    sequential_duration_seconds: float
    sequential_distance_meters: Optional[float] = None
    savings_seconds: float
    savings_percent: float
    time_saved_seconds: float
    time_saved_percent: float
    route_legs: List[List[List[float]]]
    leg_routes: Optional[List[Dict[str, Any]]] = None
    sequential_baseline: SequentialBaselineItem


class HealthResponse(BaseModel):
    status: str = "ok"
    app: str = "NYC Taxi AI Backend"


class ReadyResponse(BaseModel):
    status: str = "ready"
    ml_model_loaded: bool
    manhattan_graph_loaded: bool
