"""Comprehensive verification test for routing and dispatch modules.

Verifies:
1. Graph loading and OSM attribution metadata
2. Nearest node lookup with cKDTree
3. A* vs Dijkstra comparison on multiple OD pairs (distance identity & node visits)
4. GeoJSON reconstruction and metric calculations
5. Multi-passenger scheduler with 3 requests and capacity constraints vs sequential baseline
"""

import sys
import time
from pathlib import Path

# Add root directory to python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.routing.routing import (
    load_manhattan_graph,
    astar,
    dijkstra,
    compare_astar_vs_dijkstra,
    reconstruct_geojson_geometry,
    calculate_route_metrics,
    is_in_manhattan,
)
from backend.app.dispatch.scheduler import (
    RideRequest,
    solve_multi_passenger_dispatch,
)


def run_tests():
    print("=" * 60)
    print("TEST 1: Loading Manhattan Graph & Metadata")
    print("=" * 60)
    graph, spatial_index, heuristic = load_manhattan_graph()
    print(f"Graph loaded successfully: {len(graph.nodes)} nodes, {len(graph.adj)} source nodes in adj.")
    print("Metadata:", graph.metadata)
    assert len(graph.nodes) > 4000, "Expected at least 4000 nodes"
    assert "attribution" in graph.metadata, "Attribution missing"
    print("✓ TEST 1 PASSED\n")

    print("=" * 60)
    print("TEST 2: Nearest Node Queries on Manhattan Presets")
    print("=" * 60)
    presets = {
        "Times Square": (40.7580, -73.9855),
        "Grand Central": (40.7527, -73.9772),
        "Empire State Building": (40.7484, -73.9857),
        "Wall Street": (40.7061, -74.0090),
        "Central Park South": (40.7650, -73.9740),
        "SoHo": (40.7233, -74.0000),
    }

    preset_nodes = {}
    for name, (lat, lon) in presets.items():
        assert is_in_manhattan(lat, lon), f"{name} should be in Manhattan bbox"
        node_id, dist_m = spatial_index.nearest_node(lat, lon)
        node_data = graph.nodes[node_id]
        preset_nodes[name] = node_id
        print(f"  {name:22s} -> Node ID: {node_id:<12} (dist to node: {dist_m:.1f} m, node: [{node_data['lat']}, {node_data['lon']}])")

    print("✓ TEST 2 PASSED\n")

    print("=" * 60)
    print("TEST 3: A* vs Dijkstra Comparison across Test Pairs")
    print("=" * 60)
    test_pairs = [
        ("Times Square", "Wall Street"),
        ("Grand Central", "SoHo"),
        ("Empire State Building", "Central Park South"),
        ("Central Park South", "Wall Street"),
    ]

    for orig_name, dest_name in test_pairs:
        u = preset_nodes[orig_name]
        v = preset_nodes[dest_name]

        comp = compare_astar_vs_dijkstra(graph, u, v, heuristic=heuristic, weight="length")
        print(f"Route: {orig_name} -> {dest_name}")
        print(f"  Reachable:                 {comp['reachable']}")
        print(f"  A* Distance:               {comp['astar_cost']} m")
        print(f"  Dijkstra Distance:         {comp['dijkstra_cost']} m")
        print(f"  Identical Cost:            {comp['identical_cost']}")
        print(f"  A* Visited Nodes:          {comp['astar_visited_nodes']}")
        print(f"  Dijkstra Visited Nodes:    {comp['dijkstra_visited_nodes']}")
        print(f"  Visited Nodes Saved:       {comp['visited_nodes_saved']}")
        print(f"  Search Reduction:          {comp['search_space_reduction_pct']} %\n")

        assert comp["reachable"], f"Should be reachable between {orig_name} and {dest_name}"
        assert comp["identical_cost"], f"Costs must be identical between A* and Dijkstra for {orig_name}->{dest_name}"
        assert comp["astar_visited_nodes"] <= comp["dijkstra_visited_nodes"], "A* must visit <= nodes than Dijkstra"

    print("✓ TEST 3 PASSED\n")

    print("=" * 60)
    print("TEST 4: Route Geometry & Metrics Reconstruction")
    print("=" * 60)
    u = preset_nodes["Times Square"]
    v = preset_nodes["Wall Street"]
    cost, route = astar(graph, u, v, heuristic=heuristic, weight="length")
    geojson_coords = reconstruct_geojson_geometry(graph, route)
    metrics = calculate_route_metrics(graph, route)

    print(f"Times Square -> Wall Street:")
    print(f"  Edge count:                {len(route)}")
    print(f"  GeoJSON coordinate points: {len(geojson_coords)}")
    print(f"  Distance:                  {metrics['distance_meters']} m ({metrics['distance_km']} km)")
    print(f"  Duration:                  {metrics['duration_seconds']} s ({metrics['duration_minutes']} min)")

    assert len(geojson_coords) >= len(route), "GeoJSON coords should have at least as many points as hops"
    assert all(len(pt) == 2 for pt in geojson_coords), "Each point must be [lon, lat]"
    assert all(-74.05 <= pt[0] <= -73.90 and 40.69 <= pt[1] <= 40.88 for pt in geojson_coords), "All points must be in Manhattan"
    print("✓ TEST 4 PASSED\n")

    print("=" * 60)
    print("TEST 5: Multi-Passenger Dispatch Solver (3 Requests, Capacity=4)")
    print("=" * 60)
    vehicle_start = preset_nodes["Grand Central"]

    requests = [
        RideRequest(
            id="R1",
            pickup=preset_nodes["Times Square"],
            dropoff=preset_nodes["Wall Street"],
            passengers=1,
            pickup_name="Times Square",
            dropoff_name="Wall Street",
        ),
        RideRequest(
            id="R2",
            pickup=preset_nodes["Empire State Building"],
            dropoff=preset_nodes["SoHo"],
            passengers=1,
            pickup_name="Empire State Building",
            dropoff_name="SoHo",
        ),
        RideRequest(
            id="R3",
            pickup=preset_nodes["Central Park South"],
            dropoff=preset_nodes["Wall Street"],
            passengers=2,
            pickup_name="Central Park South",
            dropoff_name="Wall Street",
        ),
    ]

    dispatch_res = solve_multi_passenger_dispatch(
        graph=graph,
        vehicle_start=vehicle_start,
        requests=requests,
        capacity=4,
        vehicle_start_name="Grand Central",
        heuristic=heuristic,
    )

    opt = dispatch_res["optimal_schedule"]
    seq = dispatch_res["sequential_baseline"]
    comp = dispatch_res["comparison"]

    print("OPTIMAL SCHEDULE:")
    print(f"  Total Duration: {opt['total_duration_minutes']} min ({opt['total_duration_seconds']} s)")
    print(f"  Total Distance: {opt['total_distance_km']} km ({opt['total_distance_meters']} m)")
    print(f"  Load Timeline:  {opt['vehicle_load']}")
    print("\n  Stops:")
    for s in opt["stops"]:
        print(f"    Stop {s['stop_index']}: [{s['event_type'].upper():7s}] {s['location_name']:22s} | Load: {s['vehicle_load']} | Cumul Time: {s['cumulative_duration_minutes']:5.2f} min | Leg Dist: {s['leg_distance_meters']:6.1f} m")

    print("\nSEQUENTIAL BASELINE:")
    print(f"  Total Duration: {seq['total_duration_minutes']} min ({seq['total_duration_seconds']} s)")
    print(f"  Total Distance: {seq['total_distance_km']} km ({seq['total_distance_meters']} m)")
    print(f"  Load Timeline:  {seq['vehicle_load']}")

    print("\nCOMPARISON SAVINGS:")
    print(f"  Duration Saved: {comp['duration_saved_minutes']} min ({comp['duration_saved_seconds']} s) -> {comp['savings_percentage_duration']} %")
    print(f"  Distance Saved: {comp['distance_saved_km']} km ({comp['distance_saved_meters']} m) -> {comp['savings_percentage_distance']} %")

    # Assertions
    assert len(opt["stops"]) == 7, "Expected 7 stops (1 start + 3 pickups + 3 dropoffs)"
    assert all(s["vehicle_load"] <= 4 for s in opt["stops"]), "Vehicle load exceeded capacity 4"
    assert opt["stops"][-1]["vehicle_load"] == 0, "Final stop must have vehicle load 0"
    assert opt["total_duration_seconds"] <= seq["total_duration_seconds"], "Optimal schedule must be <= sequential baseline"
    print("\n✓ TEST 5 PASSED\n")

    print("=" * 60)
    print("ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    t_start = time.time()
    run_tests()
    print(f"Total test execution time: {time.time() - t_start:.2f} seconds")
