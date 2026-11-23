"""Directed routing and A* shortest path with OpenStreetMap road networks.

Implements:
- Admissible Haversine distance heuristic in meters
- A* algorithm with priority queue on MultiDiGraph (handling keyed edges, parallel edges, one-way streets)
- Dijkstra shortest path implementation
- A* vs Dijkstra verification and node visit comparison
- GeoJSON LineString geometry reconstruction
- Fast nearest-node spatial lookup (cKDTree)
"""

import json
import math
from heapq import heappop, heappush
from itertools import count
from math import inf
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

# Bounding box for Manhattan drivable filtering
MANHATTAN_BBOX = {
    "min_lon": -74.05,
    "min_lat": 40.69,
    "max_lon": -73.90,
    "max_lat": 40.88,
}

EARTH_RADIUS_METERS = 6371000.0


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points in meters.
    
    This is strictly admissible and consistent for road networks with metric lengths,
    since the great-circle surface distance is always <= road distance.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    # Clip numerical precision errors to [-1.0, 1.0]
    a = min(1.0, max(0.0, a))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_METERS * c


def get_node_coords(graph: Any, node_id: Any) -> Tuple[float, float]:
    """Return (lat, lon) for a node in graph.
    
    Supports NetworkX MultiDiGraph, dictionary representation, or RoadNetwork.
    """
    if hasattr(graph, "nodes") and node_id in graph.nodes:
        data = graph.nodes[node_id]
        lat = data.get("y", data.get("lat"))
        lon = data.get("x", data.get("lon"))
        return float(lat), float(lon)
    if isinstance(graph, dict):
        if "nodes" in graph and node_id in graph["nodes"]:
            data = graph["nodes"][node_id]
            lat = data.get("y", data.get("lat"))
            lon = data.get("x", data.get("lon"))
            return float(lat), float(lon)
    raise KeyError(f"Node {node_id} coordinates not found in graph")


def make_haversine_heuristic(graph: Any) -> Callable[[Any, Any], float]:
    """Create an admissible haversine heuristic function h(u, v) in meters."""
    # Pre-cache node coordinates for speed if possible
    coords: Dict[Any, Tuple[float, float]] = {}
    if hasattr(graph, "nodes"):
        for n, data in graph.nodes.items():
            coords[n] = (float(data.get("y", data.get("lat"))), float(data.get("x", data.get("lon"))))
    elif isinstance(graph, dict) and "nodes" in graph:
        for n, data in graph["nodes"].items():
            coords[n] = (float(data.get("y", data.get("lat"))), float(data.get("x", data.get("lon"))))

    def heuristic(u: Any, v: Any) -> float:
        if u == v:
            return 0.0
        if u in coords and v in coords:
            lat1, lon1 = coords[u]
            lat2, lon2 = coords[v]
        else:
            lat1, lon1 = get_node_coords(graph, u)
            lat2, lon2 = get_node_coords(graph, v)
        return haversine_distance(lat1, lon1, lat2, lon2)

    return heuristic


def astar(
    graph: Any,
    source: Any,
    target: Any,
    heuristic: Optional[Callable[[Any, Any], float]] = None,
    weight: str = "length",
    return_visited_count: bool = False,
) -> Union[Optional[Tuple[float, List[Tuple[Any, Any, Any]]]], Tuple[Optional[float], Optional[List[Tuple[Any, Any, Any]]], int]]:
    """A* shortest path algorithm on a directed multi-edge graph with keyed edges.
    
    Args:
        graph: MultiDiGraph or dict where graph[u][v][key] contains edge attributes.
        source: Source node ID.
        target: Destination node ID.
        heuristic: Admissible heuristic h(u, target) in cost units. If None, h=0 (Dijkstra).
        weight: Attribute key to minimize (default 'length').
        return_visited_count: Whether to return the count of visited nodes.
        
    Returns:
        If return_visited_count is False:
            (cost, [(u, v, key), ...]) or None if unreachable.
        If return_visited_count is True:
            (cost, [(u, v, key), ...], visited_count) or (None, None, visited_count) if unreachable.
    """
    if source == target:
        if return_visited_count:
            return 0.0, [], 1
        return 0.0, []

    adj = graph.adj if hasattr(graph, "adj") else (graph["adj"] if isinstance(graph, dict) and "adj" in graph else graph)
    if source not in adj or target not in adj:
        if return_visited_count:
            return None, None, 0
        return None

    if heuristic is None:
        heuristic = lambda u, v: 0.0

    sequence = count()
    # (priority, tie_breaker, cost, node)
    h_start = heuristic(source, target)
    queue = [(h_start, next(sequence), 0.0, source)]
    distance: Dict[Any, float] = {source: 0.0}
    parent: Dict[Any, Tuple[Any, Any, Any]] = {}
    visited_nodes = 0

    while queue:
        _, _, cost, node = heappop(queue)
        if cost != distance[node]:
            continue

        visited_nodes += 1

        if node == target:
            route = []
            curr = node
            while curr != source:
                edge_tuple = parent[curr]
                route.append(edge_tuple)
                curr = edge_tuple[0]
            route.reverse()
            if return_visited_count:
                return cost, route, visited_nodes
            return cost, route

        # Iterate over neighbors and keyed edges (handling parallel and one-way edges)
        node_neighbors = adj.get(node, {})
        for neighbor, edges in node_neighbors.items():
            for key, edge_data in edges.items():
                edge_weight = float(edge_data.get(weight, inf))
                candidate = cost + edge_weight
                if candidate < distance.get(neighbor, inf):
                    distance[neighbor] = candidate
                    parent[neighbor] = (node, neighbor, key)
                    priority = candidate + heuristic(neighbor, target)
                    heappush(queue, (priority, next(sequence), candidate, neighbor))

    if return_visited_count:
        return None, None, visited_nodes
    return None


def dijkstra(
    graph: Any,
    source: Any,
    target: Any,
    weight: str = "length",
    return_visited_count: bool = False,
) -> Union[Optional[Tuple[float, List[Tuple[Any, Any, Any]]]], Tuple[Optional[float], Optional[List[Tuple[Any, Any, Any]]], int]]:
    """Dijkstra shortest path algorithm (A* with heuristic = 0)."""
    return astar(
        graph=graph,
        source=source,
        target=target,
        heuristic=lambda u, v: 0.0,
        weight=weight,
        return_visited_count=return_visited_count,
    )


def compare_astar_vs_dijkstra(
    graph: Any,
    source: Any,
    target: Any,
    heuristic: Optional[Callable[[Any, Any], float]] = None,
    weight: str = "length",
) -> Dict[str, Any]:
    """Compare A* vs Dijkstra on a test pair (u, v).
    
    Verifies that both algorithms produce identical shortest lengths,
    and measures the reduction in visited nodes achieved by A*.
    """
    if heuristic is None:
        heuristic = make_haversine_heuristic(graph)

    cost_astar, route_astar, visited_astar = astar(
        graph, source, target, heuristic=heuristic, weight=weight, return_visited_count=True
    )
    cost_dijkstra, route_dijkstra, visited_dijkstra = dijkstra(
        graph, source, target, weight=weight, return_visited_count=True
    )

    if cost_astar is None or cost_dijkstra is None:
        return {
            "source": source,
            "target": target,
            "reachable": False,
            "astar_visited": visited_astar,
            "dijkstra_visited": visited_dijkstra,
        }

    is_identical = math.isclose(cost_astar, cost_dijkstra, rel_tol=1e-5, abs_tol=1e-2)
    visited_saved = max(0, visited_dijkstra - visited_astar)
    reduction_pct = (visited_saved / visited_dijkstra * 100.0) if visited_dijkstra > 0 else 0.0

    return {
        "source": source,
        "target": target,
        "reachable": True,
        "shortest_length_meters": round(cost_astar, 2),
        "astar_cost": round(cost_astar, 2),
        "dijkstra_cost": round(cost_dijkstra, 2),
        "identical_cost": is_identical,
        "astar_visited_nodes": visited_astar,
        "dijkstra_visited_nodes": visited_dijkstra,
        "visited_nodes_saved": visited_saved,
        "search_space_reduction_pct": round(reduction_pct, 2),
        "edge_count_astar": len(route_astar) if route_astar else 0,
        "edge_count_dijkstra": len(route_dijkstra) if route_dijkstra else 0,
    }


def reconstruct_geojson_geometry(
    graph: Any,
    route: List[Tuple[Any, Any, Any]],
) -> List[List[float]]:
    """Reconstruct continuous GeoJSON LineString coordinates [[lon, lat], ...] from keyed edges.
    
    Extracts detailed geometry from OSM edge attributes when present,
    or falls back to node coordinates. Deduplicates consecutive matching points.
    """
    if not route:
        return []

    coords: List[List[float]] = []
    adj = graph.adj if hasattr(graph, "adj") else (graph["adj"] if isinstance(graph, dict) and "adj" in graph else graph)

    def append_point(lon: float, lat: float):
        pt = [round(lon, 6), round(lat, 6)]
        if not coords or (abs(coords[-1][0] - pt[0]) > 1e-7 or abs(coords[-1][1] - pt[1]) > 1e-7):
            coords.append(pt)

    for u, v, key in route:
        edge_data = adj.get(u, {}).get(v, {}).get(key, {})
        geom = edge_data.get("geometry")

        if geom is not None:
            # Check if geometry is Shapely LineString or list of coordinates
            if hasattr(geom, "coords"):
                for pt in geom.coords:
                    append_point(float(pt[0]), float(pt[1]))
            elif isinstance(geom, (list, tuple)):
                for pt in geom:
                    append_point(float(pt[0]), float(pt[1]))
            else:
                u_lat, u_lon = get_node_coords(graph, u)
                v_lat, v_lon = get_node_coords(graph, v)
                append_point(u_lon, u_lat)
                append_point(v_lon, v_lat)
        else:
            u_lat, u_lon = get_node_coords(graph, u)
            v_lat, v_lon = get_node_coords(graph, v)
            append_point(u_lon, u_lat)
            append_point(v_lon, v_lat)

    return coords


def calculate_route_metrics(
    graph: Any,
    route: List[Tuple[Any, Any, Any]],
) -> Dict[str, Any]:
    """Calculate distance and duration metrics along a route of keyed edges."""
    if not route:
        return {
            "distance_meters": 0.0,
            "distance_km": 0.0,
            "duration_seconds": 0.0,
            "duration_minutes": 0.0,
        }

    adj = graph.adj if hasattr(graph, "adj") else (graph["adj"] if isinstance(graph, dict) and "adj" in graph else graph)
    total_length = 0.0
    total_duration = 0.0

    for u, v, key in route:
        edge_data = adj.get(u, {}).get(v, {}).get(key, {})
        length = float(edge_data.get("length", 0.0))
        total_length += length

        # Travel time: use precomputed travel_time, or length / speed
        if "travel_time" in edge_data:
            travel_time = float(edge_data["travel_time"])
        else:
            speed_kph = float(edge_data.get("speed_kph", 30.0))  # Default 30 km/h in city
            if speed_kph <= 0:
                speed_kph = 30.0
            speed_mps = speed_kph * 1000.0 / 3600.0
            travel_time = length / speed_mps
        total_duration += travel_time

    return {
        "distance_meters": round(total_length, 2),
        "distance_km": round(total_length / 1000.0, 3),
        "duration_seconds": round(total_duration, 1),
        "duration_minutes": round(total_duration / 60.0, 2),
    }


def is_in_manhattan(lat: float, lon: float, bbox: Optional[Dict[str, float]] = None) -> bool:
    """Check if a coordinate lies within Manhattan bounding box."""
    b = bbox or MANHATTAN_BBOX
    return (b["min_lat"] <= lat <= b["max_lat"]) and (b["min_lon"] <= lon <= b["max_lon"])


class ManhattanSpatialIndex:
    """Spatial index for fast nearest-node lookups in Manhattan road network using cKDTree."""

    def __init__(self, graph: Any):
        from scipy.spatial import cKDTree
        self.node_ids: List[Any] = []
        points: List[Tuple[float, float]] = []

        if hasattr(graph, "nodes"):
            for n, data in graph.nodes.items():
                lat = float(data.get("y", data.get("lat")))
                lon = float(data.get("x", data.get("lon")))
                self.node_ids.append(n)
                points.append((lat, lon))
        elif isinstance(graph, dict) and "nodes" in graph:
            for n, data in graph["nodes"].items():
                lat = float(data.get("y", data.get("lat")))
                lon = float(data.get("x", data.get("lon")))
                self.node_ids.append(n)
                points.append((lat, lon))

        self.kdtree = cKDTree(points)

    def nearest_node(self, lat: float, lon: float) -> Tuple[Any, float]:
        """Find the nearest node in the graph. Returns (node_id, distance_meters)."""
        dist_deg, idx = self.kdtree.query([lat, lon])
        nearest_id = self.node_ids[idx]
        # Return accurate haversine distance to nearest node
        target_lat, target_lon = self.kdtree.data[idx]
        dist_m = haversine_distance(lat, lon, target_lat, target_lon)
        return nearest_id, dist_m


class ManhattanGraph:
    """In-memory directed multi-edge road network loaded from cached JSON.
    
    Provides dictionary-like interface graph[u][v][key] and graph.nodes[u].
    """

    def __init__(self, data: Dict[str, Any]):
        self.metadata: Dict[str, Any] = data.get("metadata", {})
        self.nodes: Dict[Any, Dict[str, Any]] = {}
        for k, v in data.get("nodes", {}).items():
            nid = int(k) if str(k).isdigit() else k
            self.nodes[nid] = v

        self.adj: Dict[Any, Dict[Any, Dict[Any, Dict[str, Any]]]] = {}
        for u, neighbors in data.get("adj", {}).items():
            u_id = int(u) if str(u).isdigit() else u
            self.adj[u_id] = {}
            for v, edges in neighbors.items():
                v_id = int(v) if str(v).isdigit() else v
                self.adj[u_id][v_id] = {}
                for k, edge_data in edges.items():
                    k_id = int(k) if str(k).isdigit() else k
                    self.adj[u_id][v_id][k_id] = edge_data

    def __getitem__(self, node_id: Any) -> Dict[Any, Dict[Any, Dict[str, Any]]]:
        return self.adj[node_id]

    def __contains__(self, node_id: Any) -> bool:
        return node_id in self.adj

    def __len__(self) -> int:
        return len(self.nodes)

    def to_networkx(self):
        """Convert to networkx.MultiDiGraph if needed."""
        import networkx as nx
        G = nx.MultiDiGraph()
        for node_id, data in self.nodes.items():
            G.add_node(node_id, **data)
        for u, neighbors in self.adj.items():
            for v, edges in neighbors.items():
                for key, edge_data in edges.items():
                    G.add_edge(u, v, key=key, **edge_data)
        return G


# Global singleton instances for fast startup and reuse
_CACHED_GRAPH: Optional[ManhattanGraph] = None
_CACHED_SPATIAL_INDEX: Optional[ManhattanSpatialIndex] = None
_CACHED_HEURISTIC: Optional[Callable[[Any, Any], float]] = None


def load_manhattan_graph(
    json_path: Optional[Union[str, Path]] = None,
) -> Tuple[ManhattanGraph, ManhattanSpatialIndex, Callable[[Any, Any], float]]:
    """Load cached Manhattan road network, spatial index, and haversine heuristic.
    
    Returns:
        (graph, spatial_index, heuristic_function)
    """
    global _CACHED_GRAPH, _CACHED_SPATIAL_INDEX, _CACHED_HEURISTIC

    if _CACHED_GRAPH is not None and _CACHED_SPATIAL_INDEX is not None and _CACHED_HEURISTIC is not None:
        return _CACHED_GRAPH, _CACHED_SPATIAL_INDEX, _CACHED_HEURISTIC

    if json_path is None:
        # Default path relative to workspace or backend
        candidates = [
            Path("backend/app/data/manhattan_graph.json"),
            Path("app/data/manhattan_graph.json"),
            Path(__file__).resolve().parent.parent / "data" / "manhattan_graph.json",
        ]
        target = next((p for p in candidates if p.exists()), candidates[0])
    else:
        target = Path(json_path)

    if not target.exists():
        raise FileNotFoundError(f"Manhattan graph cache not found at {target}. Run scripts/prepare_graph.py first.")

    with open(target, "r", encoding="utf-8") as f:
        data = json.load(f)

    graph = ManhattanGraph(data)
    spatial_index = ManhattanSpatialIndex(graph)
    heuristic = make_haversine_heuristic(graph)

    _CACHED_GRAPH = graph
    _CACHED_SPATIAL_INDEX = spatial_index
    _CACHED_HEURISTIC = heuristic

    return graph, spatial_index, heuristic

