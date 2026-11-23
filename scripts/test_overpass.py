import requests

query = """[out:json][timeout:25];
(
  way["highway"~"motorway|trunk|primary|secondary|tertiary|residential"](40.705,-74.015,40.715,-74.005);
  >;
);
out body;
"""

endpoints = [
    "https://overpass.private.coffee/api/interpreter",
    "https://ovp.dresel.systems/api-na/interpreter",
    "https://api.spainip.es/v1/overpass/interpreter",
    "https://overpass-api.de/api/interpreter",
]

for ep in endpoints:
    try:
        r = requests.post(ep, data={"data": query}, timeout=10)
        print(ep, r.status_code)
        if r.status_code == 200:
            data = r.json()
            print(" -> Elements count:", len(data.get("elements", [])))
            break
    except Exception as e:
        print(ep, "Error:", e)
