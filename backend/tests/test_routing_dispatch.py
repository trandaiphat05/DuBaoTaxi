"""Unit and algorithm verification tests for routing and dispatch modules.

Verifies:
1. Manhattan drivable graph integrity and metadata
2. Admissible Haversine heuristic (never overestimates)
3. A* vs Dijkstra shortest path equivalence and visited node reduction
4. Keyed edge traversal, one-way enforcement, and parallel edge handling
5. GeoJSON LineString geometry reconstruction
6. Multi-passenger dispatch solver with capacity constraints and sequential baseline comparison
"""

import math
import pytest
from pathlib import Path

from backend.app.routing.routing import (
    load_manhattan_graph,
    astar,
    dijkstra,
    compare_astar_vs_dijkstra,
    reconstruct_geojson_geometry,
    calculate_route_metrics,
    haversine_distance,
    is_in_manhattan,
)
from backend.app.dispatch.scheduler import (
    RideRequest,
    solve_multi_passenger_dispatch,
)


@pytest.fixture(scope="module")
def manhattan_env():
    """Load graph once for the entire test module."""
    graph, spatial_index, heuristic = load_manhattan_graph()
    return {
        "graph": graph,
        "spatial_index": spatial_index,
        "heuristic": heuristic,
    }


def test_graph_and_metadata(manhattan_env):
    """Verify graph has required nodes, edges, bbox, and OpenStreetMap attribution."""
    graph = manhattan_env["graph"]
    assert len(graph.nodes) >= 4000
    assert len(graph) >= 4000
    meta = graph.metadata
    assert "attribution" in meta
    assert "OpenStreetMap" in meta["attribution"]
    assert "bbox" in meta
    assert meta["bbox"] == [-74.05, 40.69, -73.90, 40.88]


def test_haversine_admissibility(manhattan_env):
    """Verify great circle distance is strictly admissible (<= road length)."""
    graph = manhattan_env["graph"]
    spatial_index = manhattan_env["spatial_index"]
    heuristic = manhattan_env["heuristic"]

    # Test pair: Times Square to Wall Street
    u, _ = spatial_index.nearest_node(40.7580, -73.9855)
    v, _ = spatial_index.nearest_node(40.7061, -74.0090)

    h_dist = heuristic(u, v)
    cost, route = astar(graph, u, v, heuristic=heuristic, weight="length")

    assert cost is not None
    # Admissibility condition: h(u, v) <= actual shortest path cost d(u, v)
    assert h_dist <= cost
    assert h_dist > 5000  # Times Square to Wall Street is ~5.8 km direct


def test_astar_dijkstra_equivalence(manhattan_env):
    """Verify A* and Dijkstra find identical shortest path costs, with A* exploring fewer nodes."""
    graph = manhattan_env["graph"]
    spatial_index = manhattan_env["spatial_index"]
    heuristic = manhattan_env["heuristic"]

    test_pairs = [
        ((40.7580, -73.9855), (40.7061, -74.0090)),  # Times Square -> Wall Street
        ((40.7527, -73.9772), (40.7233, -74.0000)),  # Grand Central -> SoHo
        ((40.7484, -73.9857), (40.7650, -73.9740)),  # Empire State -> Central Park South
    ]

    for orig_coords, dest_coords in test_pairs:
        u, _ = spatial_index.nearest_node(*orig_coords)
        v, _ = spatial_index.nearest_node(*dest_coords)

        comp = compare_astar_vs_dijkstra(graph, u, v, heuristic=heuristic, weight="length")
        assert comp["reachable"] is True
        assert comp["identical_cost"] is True
        assert math.isclose(comp["astar_cost"], comp["dijkstra_cost"], rel_tol=1e-5)
        # A* must prune search space and visit fewer nodes than Dijkstra
        assert comp["astar_visited_nodes"] < comp["dijkstra_visited_nodes"]
        assert comp["search_space_reduction_pct"] > 50.0  # Typically >70%


def test_geojson_geometry_reconstruction(manhattan_env):
    """Verify reconstruction of GeoJSON LineString coordinates [[lon, lat], ...]."""
    graph = manhattan_env["graph"]
    spatial_index = manhattan_env["spatial_index"]
    heuristic = manhattan_env["heuristic"]

    u, _ = spatial_index.nearest_node(40.7580, -73.9855)  # Times Square
    v, _ = spatial_index.nearest_node(40.7527, -73.9772)  # Grand Central

    cost, route = astar(graph, u, v, heuristic=heuristic, weight="length")
    assert route is not None
    assert len(route) > 0

    coords = reconstruct_geojson_geometry(graph, route)
    assert len(coords) >= len(route)
    # Check each coordinate is [lon, lat]
    for pt in coords:
        assert len(pt) == 2
        lon, lat = pt
        assert -74.05 <= lon <= -73.90
        assert 40.69 <= lat <= 40.88

    metrics = calculate_route_metrics(graph, route)
    assert metrics["distance_meters"] > 0
    assert metrics["duration_seconds"] > 0


def test_multi_passenger_dispatch_solver(manhattan_env):
    """Verify 3-request multi-passenger dispatch with capacity constraint and sequential baseline."""
    graph = manhattan_env["graph"]
    spatial_index = manhattan_env["spatial_index"]
    heuristic = manhattan_env["heuristic"]

    start_node, _ = spatial_index.nearest_node(40.7527, -73.9772)  # Grand Central
    ts_node, _ = spatial_index.nearest_node(40.7580, -73.9855)     # Times Square
    ws_node, _ = spatial_index.nearest_node(40.7061, -74.0090)     # Wall Street
    es_node, _ = spatial_index.nearest_node(40.7484, -73.9857)     # Empire State
    soho_node, _ = spatial_index.nearest_node(40.7233, -74.0000)   # SoHo
    cp_node, _ = spatial_index.nearest_node(40.7650, -73.9740)     # Central Park

    capacity = 4
    requests = [
        RideRequest(id="1", pickup=ts_node, dropoff=ws_node, passengers=1),
        RideRequest(id="2", pickup=es_node, dropoff=soho_node, passengers=1),
        RideRequest(id="3", pickup=cp_node, dropoff=ws_node, passengers=2),
    ]

    res = solve_multi_passenger_dispatch(
        graph=graph,
        vehicle_start=start_node,
        requests=requests,
        capacity=capacity,
        heuristic=heuristic,
    )

    assert res["status"] == "success"
    opt = res["optimal_schedule"]
    seq = res["sequential_baseline"]
    comp = res["comparison"]

    # 1. 7 stops: start + 3 pickups + 3 dropoffs
    assert len(opt["stops"]) == 7
    # 2. Check capacity constraint is strictly satisfied at all times
    for s in opt["stops"]:
        assert 0 <= s["vehicle_load"] <= capacity
    assert opt["stops"][-1]["vehicle_load"] == 0

    # 3. Check precedence: pickup must occur before dropoff for each request
    pickup_indices = {}
    dropoff_indices = {}
    for idx, s in enumerate(opt["stops"]):
        if s["event_type"] == "pickup":
            pickup_indices[s["request_id"]] = idx
        elif s["event_type"] == "dropoff":
            dropoff_indices[s["request_id"]] = idx

    for req_id in ["1", "2", "3"]:
        assert req_id in pickup_indices
        assert req_id in dropoff_indices
        assert pickup_indices[req_id] < dropoff_indices[req_id]

    # 4. Check sequential baseline comparison
    assert opt["total_duration_seconds"] <= seq["total_duration_seconds"]
    assert comp["duration_saved_seconds"] >= 0
    assert comp["savings_percentage_duration"] > 0
