"""Multi-passenger ride pooling and dispatch service."""

import math
from typing import Any, Dict, List, Optional, Tuple

from backend.app.dispatch.scheduler import (
    RideRequest,
    solve_multi_passenger_dispatch,
)
from backend.app.services.geo_utils import (
    is_in_manhattan,
    validate_capacity,
    validate_passenger_count,
    validate_point_in_manhattan,
)
from backend.app.services.routing_service import routing_service


class DispatchService:
    def __init__(self):
        pass

    def solve_dispatch(
        self,
        start_lon: float,
        start_lat: float,
        requests: List[Dict[str, Any]],
        capacity: int = 4,
    ) -> Dict[str, Any]:
        """
        Solve multi-passenger pooling schedule for a single vehicle with capacity constraints.
        Returns ordered stops, vehicle loads, leg routes, total duration/distance, and sequential baseline.
        """
        # 1. Validation
        validate_capacity(capacity)
        validate_point_in_manhattan(start_lon, start_lat, "Vị trí xe xuất phát")

        if not requests or len(requests) == 0:
            raise ValueError("Danh sách yêu cầu chuyến đi không được để trống.")
        if len(requests) > 4:
            raise ValueError("Hệ thống hỗ trợ tối đa 4 yêu cầu đón trả đồng thời để đảm bảo thời gian phản hồi tức thì.")

        ride_requests: List[RideRequest] = []

        for idx, req in enumerate(requests):
            req_id = str(req.get("id", idx + 1))
            name = req.get("name") or f"Khách {req_id}"
            p_lon = float(req.get("pickup_lon", req.get("pickup_longitude", 0.0)))
            p_lat = float(req.get("pickup_lat", req.get("pickup_latitude", 0.0)))
            d_lon = float(req.get("dropoff_lon", req.get("dropoff_longitude", 0.0)))
            d_lat = float(req.get("dropoff_lat", req.get("dropoff_latitude", 0.0)))
            passengers = int(req.get("passengers", req.get("passenger_count", 1)))

            # Validate Manhattan coords
            if not is_in_manhattan(p_lon, p_lat):
                raise ValueError(f"Điểm đón nằm ngoài Manhattan. Hãy chọn lại trên bản đồ.")
            if not is_in_manhattan(d_lon, d_lat):
                raise ValueError(f"Điểm trả nằm ngoài Manhattan. Hãy chọn lại trên bản đồ.")
            if abs(p_lon - d_lon) < 1e-5 and abs(p_lat - d_lat) < 1e-5:
                raise ValueError(f"Điểm đón và điểm trả trùng nhau.")

            validate_passenger_count(passengers)
            if passengers > capacity:
                raise ValueError(
                    f"Số hành khách của {name} ({passengers} người) vượt quá sức chứa xe ({capacity} chỗ)."
                )

            # Find nearest graph nodes
            p_node = routing_service.find_nearest_node(p_lon, p_lat)
            d_node = routing_service.find_nearest_node(d_lon, d_lat)

            ride_requests.append(
                RideRequest(
                    id=req_id,
                    pickup=p_node,
                    dropoff=d_node,
                    passengers=passengers,
                    pickup_coords=(p_lat, p_lon),
                    dropoff_coords=(d_lat, d_lon),
                    pickup_name=f"Đón {name}",
                    dropoff_name=f"Trả {name}",
                )
            )

        start_node = routing_service.find_nearest_node(start_lon, start_lat)

        # 2. Call solver
        res = solve_multi_passenger_dispatch(
            graph=routing_service.graph_data,
            vehicle_start=start_node,
            requests=ride_requests,
            capacity=capacity,
            vehicle_start_coords=(start_lat, start_lon),
            vehicle_start_name="Vị trí xuất phát",
        )

        opt = res["optimal_schedule"]
        seq = res["sequential_baseline"]
        comp = res["comparison"]

        # 3. Format stops for API and frontend
        formatted_stops = []
        for s in opt["stops"]:
            # Skip start stop in the visual timeline table if desired, or keep as step 0
            if s["event_type"] == "start":
                continue

            event_type = s["event_type"]
            passenger_name = s.get("location_name", "").replace("Đón ", "").replace("Trả ", "")
            req_id = s.get("request_id")
            label = s.get("location_name") or (f"Đón {passenger_name}" if event_type == "pickup" else f"Trả {passenger_name}")

            formatted_stops.append({
                "step": len(formatted_stops) + 1,
                "event": event_type,
                "request_id": req_id,
                "passenger_name": passenger_name,
                "location": s["location"],  # [lon, lat]
                "load": s["vehicle_load"],
                "vehicle_load": s["vehicle_load"],
                "cumulative_duration_seconds": s["cumulative_duration_seconds"],
                "cumulative_distance_meters": s["cumulative_distance_meters"],
                "label": label,
            })

        # Leaflet polylines: list of legs, each leg is [[lat, lon], ...]
        route_legs: List[List[List[float]]] = []
        for leg in opt["leg_routes"]:
            leaflet_coords = [[pt[1], pt[0]] for pt in leg]
            route_legs.append(leaflet_coords)

        # Detailed leg routes for API
        leg_routes = []
        for idx, leg in enumerate(opt["leg_routes"]):
            leg_routes.append({
                "leg_index": idx + 1,
                "coordinates": leg,
            })

        vehicle_load_timeline = [s["vehicle_load"] for s in formatted_stops]

        return {
            "stops": formatted_stops,
            "vehicle_load": vehicle_load_timeline,
            "total_distance_meters": opt["total_distance_meters"],
            "total_duration_seconds": opt["total_duration_seconds"],
            "total_duration_minutes": opt["total_duration_minutes"],
            "sequential_duration_seconds": seq["total_duration_seconds"],
            "sequential_distance_meters": seq["total_distance_meters"],
            "savings_seconds": comp["duration_saved_seconds"],
            "savings_percent": comp["savings_percentage_duration"],
            "time_saved_seconds": comp["duration_saved_seconds"],
            "time_saved_percent": comp["savings_percentage_duration"],
            "route_legs": route_legs,
            "leg_routes": leg_routes,
            "sequential_baseline": {
                "total_distance_meters": seq["total_distance_meters"],
                "total_duration_seconds": seq["total_duration_seconds"],
                "total_duration_minutes": seq["total_duration_minutes"],
                "distance_saved_meters": comp["distance_saved_meters"],
                "duration_saved_seconds": comp["duration_saved_seconds"],
                "saving_percentage": comp["savings_percentage_duration"],
            },
        }


# Singleton service instance
dispatch_service = DispatchService()
