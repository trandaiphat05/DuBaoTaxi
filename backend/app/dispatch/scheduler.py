"""Multi-passenger vehicle dispatch and scheduling solver.

Optimizes pickup and delivery ordering for a single vehicle serving multiple requests (e.g. 3 requests)
with capacity constraints, and compares against a sequential baseline.
"""

from dataclasses import dataclass, field
import math
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

from backend.app.routing.routing import (
    astar,
    calculate_route_metrics,
    haversine_distance,
    reconstruct_geojson_geometry,
)


@dataclass
class RideRequest:
    id: str
    pickup: Any  # node_id or (lat, lon)
    dropoff: Any  # node_id or (lat, lon)
    passengers: int = 1
    pickup_coords: Optional[Tuple[float, float]] = None  # (lat, lon)
    dropoff_coords: Optional[Tuple[float, float]] = None  # (lat, lon)
    pickup_name: Optional[str] = None
    dropoff_name: Optional[str] = None


@dataclass
class DispatchStop:
    stop_index: int
    event_type: str  # "start", "pickup", "dropoff"
    request_id: Optional[str]
    location: Any  # node_id
    coords: List[float]  # [lon, lat]
    location_name: str
    passengers_change: int
    vehicle_load: int
    leg_duration_seconds: float
    leg_duration_minutes: float
    leg_distance_meters: float
    leg_distance_km: float
    cumulative_duration_seconds: float
    cumulative_duration_minutes: float
    cumulative_distance_meters: float
    cumulative_distance_km: float
    leg_route: List[List[float]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "stop_index": self.stop_index,
            "event_type": self.event_type,
            "request_id": self.request_id,
            "location": self.coords,
            "location_name": self.location_name,
            "passengers_change": self.passengers_change,
            "vehicle_load": self.vehicle_load,
            "leg_duration_seconds": round(self.leg_duration_seconds, 1),
            "leg_duration_minutes": round(self.leg_duration_minutes, 2),
            "leg_distance_meters": round(self.leg_distance_meters, 1),
            "leg_distance_km": round(self.leg_distance_km, 3),
            "cumulative_duration_seconds": round(self.cumulative_duration_seconds, 1),
            "cumulative_duration_minutes": round(self.cumulative_duration_minutes, 2),
            "cumulative_distance_meters": round(self.cumulative_distance_meters, 1),
            "cumulative_distance_km": round(self.cumulative_distance_km, 3),
            "leg_route": self.leg_route,
        }


def compute_leg_path_and_cost(
    graph: Any,
    u_node: Any,
    v_node: Any,
    heuristic: Optional[Callable[[Any, Any], float]] = None,
) -> Tuple[float, float, List[List[float]]]:
    """Compute (duration_seconds, distance_meters, geojson_coords) between two nodes."""
    if u_node == v_node:
        coords = []
        if hasattr(graph, "nodes") and u_node in graph.nodes:
            node_data = graph.nodes[u_node]
            coords = [[float(node_data.get("x", node_data.get("lon"))), float(node_data.get("y", node_data.get("lat")))]]
        return 0.0, 0.0, coords

    res = astar(graph, u_node, v_node, heuristic=heuristic, weight="length")
    if res is None:
        # Fallback to direct haversine if graph path unreachable
        lat1, lon1 = 0.0, 0.0
        lat2, lon2 = 0.0, 0.0
        if hasattr(graph, "nodes"):
            u_d = graph.nodes.get(u_node, {})
            v_d = graph.nodes.get(v_node, {})
            lat1, lon1 = float(u_d.get("y", 0.0)), float(u_d.get("x", 0.0))
            lat2, lon2 = float(v_d.get("y", 0.0)), float(v_d.get("x", 0.0))
        dist_m = haversine_distance(lat1, lon1, lat2, lon2)
        speed_mps = 30.0 * 1000.0 / 3600.0  # 30 km/h
        duration = dist_m / speed_mps
        return duration, dist_m, [[lon1, lat1], [lon2, lat2]]

    cost_meters, route = res
    metrics = calculate_route_metrics(graph, route)
    geojson_geom = reconstruct_geojson_geometry(graph, route)
    return metrics["duration_seconds"], metrics["distance_meters"], geojson_geom


def solve_multi_passenger_dispatch(
    graph: Any,
    vehicle_start: Any,
    requests: List[RideRequest],
    capacity: int = 4,
    vehicle_start_coords: Optional[Tuple[float, float]] = None,
    vehicle_start_name: str = "Vị trí xe hiện tại",
    heuristic: Optional[Callable[[Any, Any], float]] = None,
) -> Dict[str, Any]:
    """Find the optimal pooled dispatch schedule for up to 3 requests with capacity constraints,
    and compute comparison with sequential baseline.
    
    Args:
        graph: Road network graph.
        vehicle_start: Node ID of vehicle start.
        requests: List of RideRequest objects (up to 3 requests).
        capacity: Maximum passenger capacity of the vehicle.
        vehicle_start_coords: (lat, lon) for start location if available.
        vehicle_start_name: Label for starting location.
        heuristic: A* heuristic function.
        
    Returns:
        Dictionary containing optimal schedule, sequential baseline, and comparison metrics.
    """
    n_req = len(requests)
    if n_req == 0:
        return {"error": "Danh sách yêu cầu rỗng"}
    if capacity < 1:
        raise ValueError("Sức chứa xe phải ít nhất là 1")
    for req in requests:
        if req.passengers < 1:
            raise ValueError(f"Số khách cho chuyến {req.id} phải lớn hơn 0")
        if req.passengers > capacity:
            raise ValueError(f"Số khách ({req.passengers}) vượt quá sức chứa xe ({capacity})")

    # 1. Build list of unique stops and precompute all-pairs shortest paths
    all_stops_nodes = [vehicle_start]
    stop_labels = {vehicle_start: vehicle_start_name}

    for req in requests:
        all_stops_nodes.append(req.pickup)
        all_stops_nodes.append(req.dropoff)
        stop_labels[req.pickup] = req.pickup_name or f"Đón khách {req.id}"
        stop_labels[req.dropoff] = req.dropoff_name or f"Trả khách {req.id}"

    # Precompute pairwise legs
    leg_cache: Dict[Tuple[Any, Any], Tuple[float, float, List[List[float]]]] = {}
    unique_nodes = list(set(all_stops_nodes))
    for u in unique_nodes:
        for v in unique_nodes:
            leg_cache[(u, v)] = compute_leg_path_and_cost(graph, u, v, heuristic=heuristic)

    # Helper to get [lon, lat]
    def get_coords(node: Any, fallback: Optional[Tuple[float, float]] = None) -> List[float]:
        if hasattr(graph, "nodes") and node in graph.nodes:
            d = graph.nodes[node]
            return [round(float(d.get("x", d.get("lon"))), 6), round(float(d.get("y", d.get("lat"))), 6)]
        if fallback:
            return [round(fallback[1], 6), round(fallback[0], 6)]
        return [0.0, 0.0]

    start_coords = get_coords(vehicle_start, fallback=vehicle_start_coords)

    # 2. Branch and bound / Exhaustive search for Optimal Pooled Schedule
    # State: (current_node, req_states_tuple, current_load, current_duration, current_distance, stops_list)
    # req_state: 0 = not picked up, 1 = in vehicle, 2 = dropped off
    best_duration = math.inf
    best_schedule_stops: Optional[List[Tuple[str, str, Any, int, float, float, List[List[float]]]]] = None

    def search(curr_node: Any, states: Tuple[int, ...], load: int, cum_dur: float, cum_dist: float, history: list):
        nonlocal best_duration, best_schedule_stops
        # Pruning: duration already worse
        if cum_dur >= best_duration:
            return

        # Goal check: all requests delivered (all states == 2)
        if all(s == 2 for s in states):
            best_duration = cum_dur
            best_schedule_stops = list(history)
            return

        for idx, req in enumerate(requests):
            s = states[idx]
            # Option 1: Pickup this passenger if not picked up yet and load + seats <= capacity
            if s == 0 and load + req.passengers <= capacity:
                dest = req.pickup
                leg_dur, leg_dist, leg_path = leg_cache[(curr_node, dest)]
                next_states = list(states)
                next_states[idx] = 1
                history.append(("pickup", req.id, dest, load + req.passengers, leg_dur, leg_dist, leg_path))
                search(dest, tuple(next_states), load + req.passengers, cum_dur + leg_dur, cum_dist + leg_dist, history)
                history.pop()

            # Option 2: Drop off this passenger if currently in vehicle
            elif s == 1:
                dest = req.dropoff
                leg_dur, leg_dist, leg_path = leg_cache[(curr_node, dest)]
                next_states = list(states)
                next_states[idx] = 2
                history.append(("dropoff", req.id, dest, load - req.passengers, leg_dur, leg_dist, leg_path))
                search(dest, tuple(next_states), load - req.passengers, cum_dur + leg_dur, cum_dist + leg_dist, history)
                history.pop()

    initial_states = tuple(0 for _ in range(n_req))
    search(vehicle_start, initial_states, 0, 0.0, 0.0, [])

    # 3. Format Optimal Schedule
    optimal_stops: List[DispatchStop] = []
    # Add Start Stop
    optimal_stops.append(
        DispatchStop(
            stop_index=0,
            event_type="start",
            request_id=None,
            location=vehicle_start,
            coords=start_coords,
            location_name=vehicle_start_name,
            passengers_change=0,
            vehicle_load=0,
            leg_duration_seconds=0.0,
            leg_duration_minutes=0.0,
            leg_distance_meters=0.0,
            leg_distance_km=0.0,
            cumulative_duration_seconds=0.0,
            cumulative_duration_minutes=0.0,
            cumulative_distance_meters=0.0,
            cumulative_distance_km=0.0,
            leg_route=[],
        )
    )

    opt_cum_dur = 0.0
    opt_cum_dist = 0.0
    opt_load_timeline = [0]
    opt_leg_routes: List[List[List[float]]] = []

    if best_schedule_stops:
        for idx, (event_type, req_id, node, load, leg_dur, leg_dist, leg_path) in enumerate(best_schedule_stops, start=1):
            opt_cum_dur += leg_dur
            opt_cum_dist += leg_dist
            opt_load_timeline.append(load)
            opt_leg_routes.append(leg_path)

            req_obj = next(r for r in requests if r.id == req_id)
            chg = req_obj.passengers if event_type == "pickup" else -req_obj.passengers
            coords = get_coords(node, req_obj.pickup_coords if event_type == "pickup" else req_obj.dropoff_coords)
            name = stop_labels.get(node, f"{'Đón' if event_type == 'pickup' else 'Trả'} {req_id}")

            optimal_stops.append(
                DispatchStop(
                    stop_index=idx,
                    event_type=event_type,
                    request_id=req_id,
                    location=node,
                    coords=coords,
                    location_name=name,
                    passengers_change=chg,
                    vehicle_load=load,
                    leg_duration_seconds=leg_dur,
                    leg_duration_minutes=leg_dur / 60.0,
                    leg_distance_meters=leg_dist,
                    leg_distance_km=leg_dist / 1000.0,
                    cumulative_duration_seconds=opt_cum_dur,
                    cumulative_duration_minutes=opt_cum_dur / 60.0,
                    cumulative_distance_meters=opt_cum_dist,
                    cumulative_distance_km=opt_cum_dist / 1000.0,
                    leg_route=leg_path,
                )
            )

    # 4. Compute Sequential Baseline (Serve req 0, then req 1, then req 2 without pooling)
    seq_stops: List[DispatchStop] = []
    seq_stops.append(
        DispatchStop(
            stop_index=0,
            event_type="start",
            request_id=None,
            location=vehicle_start,
            coords=start_coords,
            location_name=vehicle_start_name,
            passengers_change=0,
            vehicle_load=0,
            leg_duration_seconds=0.0,
            leg_duration_minutes=0.0,
            leg_distance_meters=0.0,
            leg_distance_km=0.0,
            cumulative_duration_seconds=0.0,
            cumulative_duration_minutes=0.0,
            cumulative_distance_meters=0.0,
            cumulative_distance_km=0.0,
            leg_route=[],
        )
    )

    seq_cum_dur = 0.0
    seq_cum_dist = 0.0
    seq_curr_node = vehicle_start
    seq_load_timeline = [0]
    seq_leg_routes: List[List[List[float]]] = []
    seq_stop_counter = 1

    for req in requests:
        # 1. Go to pickup
        dur1, dist1, path1 = leg_cache[(seq_curr_node, req.pickup)]
        seq_cum_dur += dur1
        seq_cum_dist += dist1
        seq_load_timeline.append(req.passengers)
        seq_leg_routes.append(path1)
        p_coords = get_coords(req.pickup, req.pickup_coords)

        seq_stops.append(
            DispatchStop(
                stop_index=seq_stop_counter,
                event_type="pickup",
                request_id=req.id,
                location=req.pickup,
                coords=p_coords,
                location_name=stop_labels.get(req.pickup, f"Đón {req.id}"),
                passengers_change=req.passengers,
                vehicle_load=req.passengers,
                leg_duration_seconds=dur1,
                leg_duration_minutes=dur1 / 60.0,
                leg_distance_meters=dist1,
                leg_distance_km=dist1 / 1000.0,
                cumulative_duration_seconds=seq_cum_dur,
                cumulative_duration_minutes=seq_cum_dur / 60.0,
                cumulative_distance_meters=seq_cum_dist,
                cumulative_distance_km=seq_cum_dist / 1000.0,
                leg_route=path1,
            )
        )
        seq_stop_counter += 1

        # 2. Go to dropoff
        dur2, dist2, path2 = leg_cache[(req.pickup, req.dropoff)]
        seq_cum_dur += dur2
        seq_cum_dist += dist2
        seq_load_timeline.append(0)
        seq_leg_routes.append(path2)
        d_coords = get_coords(req.dropoff, req.dropoff_coords)

        seq_stops.append(
            DispatchStop(
                stop_index=seq_stop_counter,
                event_type="dropoff",
                request_id=req.id,
                location=req.dropoff,
                coords=d_coords,
                location_name=stop_labels.get(req.dropoff, f"Trả {req.id}"),
                passengers_change=-req.passengers,
                vehicle_load=0,
                leg_duration_seconds=dur2,
                leg_duration_minutes=dur2 / 60.0,
                leg_distance_meters=dist2,
                leg_distance_km=dist2 / 1000.0,
                cumulative_duration_seconds=seq_cum_dur,
                cumulative_duration_minutes=seq_cum_dur / 60.0,
                cumulative_distance_meters=seq_cum_dist,
                cumulative_distance_km=seq_cum_dist / 1000.0,
                leg_route=path2,
            )
        )
        seq_stop_counter += 1
        seq_curr_node = req.dropoff

    # 5. Calculate Savings Comparison
    duration_saved_seconds = max(0.0, seq_cum_dur - opt_cum_dur)
    distance_saved_meters = max(0.0, seq_cum_dist - opt_cum_dist)
    savings_pct_duration = (duration_saved_seconds / seq_cum_dur * 100.0) if seq_cum_dur > 0 else 0.0
    savings_pct_distance = (distance_saved_meters / seq_cum_dist * 100.0) if seq_cum_dist > 0 else 0.0

    return {
        "status": "success",
        "requests_count": n_req,
        "vehicle_capacity": capacity,
        "optimal_schedule": {
            "total_duration_seconds": round(opt_cum_dur, 1),
            "total_duration_minutes": round(opt_cum_dur / 60.0, 2),
            "total_distance_meters": round(opt_cum_dist, 1),
            "total_distance_km": round(opt_cum_dist / 1000.0, 3),
            "stops": [s.to_dict() for s in optimal_stops],
            "vehicle_load": opt_load_timeline,
            "leg_routes": opt_leg_routes,
        },
        "sequential_baseline": {
            "total_duration_seconds": round(seq_cum_dur, 1),
            "total_duration_minutes": round(seq_cum_dur / 60.0, 2),
            "total_distance_meters": round(seq_cum_dist, 1),
            "total_distance_km": round(seq_cum_dist / 1000.0, 3),
            "stops": [s.to_dict() for s in seq_stops],
            "vehicle_load": seq_load_timeline,
            "leg_routes": seq_leg_routes,
        },
        "comparison": {
            "duration_saved_seconds": round(duration_saved_seconds, 1),
            "duration_saved_minutes": round(duration_saved_seconds / 60.0, 2),
            "distance_saved_meters": round(distance_saved_meters, 1),
            "distance_saved_km": round(distance_saved_meters / 1000.0, 3),
            "savings_percentage_duration": round(savings_pct_duration, 1),
            "savings_percentage_distance": round(savings_pct_distance, 1),
        },
    }
