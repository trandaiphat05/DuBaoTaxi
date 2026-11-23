"""Download, process, and cache the Manhattan drivable road network.

Saves to backend/app/data/manhattan_graph.json with:
- Nodes (lat, lon, x, y)
- Keyed edges (u, v, key) with length, speed_kph, travel_time, oneway, geometry
- OSM attribution and metadata
"""

import json
import os
import sys
import time
from pathlib import Path
import networkx as nx
import osmnx as ox

OVERPASS_SERVERS = [
    "https://ovp.dresel.systems/api-na/interpreter",
    "https://api.spainip.es/v1/overpass/interpreter",
    "https://overpass-api.de/api/interpreter",
]

OUTPUT_DIR = Path("backend/app/data")
OUTPUT_FILE = OUTPUT_DIR / "manhattan_graph.json"

MANHATTAN_BBOX = {
    "min_lon": -74.05,
    "min_lat": 40.69,
    "max_lon": -73.90,
    "max_lat": 40.88,
}


def download_manhattan_graph() -> nx.MultiDiGraph:
    """Download Manhattan drivable road network with fallback across Overpass mirrors."""
    ox.settings.use_cache = True
    ox.settings.log_console = True
    ox.settings.requests_timeout = 180
    ox.settings.overpass_rate_limit = False

    graph = None
    for server in OVERPASS_SERVERS:
        print(f"Using Overpass server: {server} ...", flush=True)
        ox.settings.overpass_url = server
        try:
            print("Querying place: 'Manhattan, New York, New York, USA' (network_type='drive') ...", flush=True)
            graph = ox.graph_from_place(
                "Manhattan, New York, New York, USA",
                network_type="drive",
                simplify=True,
            )
            print(f"Successfully obtained Manhattan graph ({len(graph.nodes)} nodes, {len(graph.edges)} edges)!", flush=True)
            break
        except Exception as e:
            print(f"Querying place failed on {server}: {e}", flush=True)

    if graph is None:
        raise RuntimeError("Failed to obtain Manhattan road network.")

    return graph


def process_graph(graph: nx.MultiDiGraph) -> nx.MultiDiGraph:
    """Add speeds, travel times, filter to largest strongly connected component."""
    print("Processing graph edge speeds and travel times...", flush=True)
    try:
        graph = ox.routing.add_edge_speeds(graph)
        graph = ox.routing.add_edge_travel_times(graph)
    except AttributeError:
        graph = ox.add_edge_speeds(graph)
        graph = ox.add_edge_travel_times(graph)

    # Filter to largest strongly connected component for guaranteed reachability
    print("Extracting largest strongly connected component...", flush=True)
    try:
        graph = ox.truncate.largest_component(graph, strongly=True)
    except Exception:
        scc = max(nx.strongly_connected_components(graph), key=len)
        graph = graph.subgraph(scc).copy()

    print(f"Processed graph: {len(graph.nodes)} nodes, {len(graph.edges)} edges", flush=True)
    return graph


def serialize_to_json(graph: nx.MultiDiGraph, output_path: Path):
    """Serialize graph to JSON format with nodes, keyed edges, speeds, lengths, geometries, and OSM attribution."""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    nodes_dict = {}
    for node, data in graph.nodes(data=True):
        lat = float(data.get("y", data.get("lat", 0.0)))
        lon = float(data.get("x", data.get("lon", 0.0)))
        nodes_dict[str(node)] = {
            "y": round(lat, 6),
            "x": round(lon, 6),
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "osmid": int(node) if str(node).isdigit() else str(node),
        }

    adj_dict = {}
    total_edges = 0
    for u, v, k, data in graph.edges(keys=True, data=True):
        u_str = str(u)
        v_str = str(v)
        k_str = str(k)

        if u_str not in adj_dict:
            adj_dict[u_str] = {}
        if v_str not in adj_dict[u_str]:
            adj_dict[u_str][v_str] = {}

        length = float(data.get("length", 0.0))
        speed_kph = float(data.get("speed_kph", 30.0))
        if speed_kph <= 0:
            speed_kph = 30.0
        travel_time = float(data.get("travel_time", length / (speed_kph * 1000.0 / 3600.0)))

        # Convert geometry to GeoJSON coordinates [[lon, lat], ...]
        geom = data.get("geometry")
        geom_coords = None
        if geom is not None and hasattr(geom, "coords"):
            geom_coords = [[round(pt[0], 6), round(pt[1], 6)] for pt in geom.coords]
        else:
            u_node = nodes_dict[u_str]
            v_node = nodes_dict[v_str]
            geom_coords = [[u_node["lon"], u_node["lat"]], [v_node["lon"], v_node["lat"]]]

        name = data.get("name")
        if isinstance(name, list):
            name = " / ".join(str(n) for n in name)
        elif name is None:
            name = ""
        else:
            name = str(name)

        highway = data.get("highway")
        if isinstance(highway, list):
            highway = highway[0]
        highway = str(highway) if highway else "unclassified"

        edge_entry = {
            "length": round(length, 2),
            "speed_kph": round(speed_kph, 1),
            "travel_time": round(travel_time, 2),
            "oneway": bool(data.get("oneway", True)),
            "name": name,
            "highway": highway,
            "geometry": geom_coords,
        }
        adj_dict[u_str][v_str][k_str] = edge_entry
        total_edges += 1

    payload = {
        "metadata": {
            "name": "Manhattan Drivable Road Network",
            "attribution": "© OpenStreetMap contributors (ODbL 1.0)",
            "source": "OpenStreetMap via OSMnx",
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "node_count": len(nodes_dict),
            "edge_count": total_edges,
            "bbox": [
                MANHATTAN_BBOX["min_lon"],
                MANHATTAN_BBOX["min_lat"],
                MANHATTAN_BBOX["max_lon"],
                MANHATTAN_BBOX["max_lat"],
            ],
            "units": {
                "length": "meters",
                "speed": "km/h",
                "travel_time": "seconds",
                "coordinates": "WGS84 [lon, lat]",
            },
        },
        "nodes": nodes_dict,
        "adj": adj_dict,
    }

    print(f"Writing {len(nodes_dict)} nodes and {total_edges} keyed edges to {output_path}...", flush=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"))

    size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"Successfully cached Manhattan graph ({size_mb:.2f} MB) at {output_path}", flush=True)


if __name__ == "__main__":
    t0 = time.time()
    g = download_manhattan_graph()
    g = process_graph(g)
    serialize_to_json(g, OUTPUT_FILE)
    print(f"Finished in {time.time() - t0:.2f} seconds!", flush=True)
