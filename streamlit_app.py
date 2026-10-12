import html
import json
import math

import requests
import streamlit as st
import streamlit.components.v1 as components


OSRM_URL = "https://router.project-osrm.org/route/v1/driving"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
DEFAULT_PICKUP = (28.6139, 77.2090)
ROUTE_WEIGHTS = {"time": 0.45, "distance": 0.20, "congestion": 0.20, "incidents": 0.15}
INCIDENT_PENALTIES = {
    "Congestion": {"Low": 0.04, "Medium": 0.09, "High": 0.16},
    "Blockage": {"Low": 0.18, "Medium": 0.35, "High": 0.65},
    "Accident": {"Low": 0.14, "Medium": 0.30, "High": 0.55},
}


def haversine_meters(first, second):
    earth_radius = 6_371_000
    lat1, lon1 = map(math.radians, first)
    lat2, lon2 = map(math.radians, second)
    delta_lat = lat2 - lat1
    delta_lon = lon2 - lon1
    value = math.sin(delta_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2) ** 2
    return 2 * earth_radius * math.atan2(math.sqrt(value), math.sqrt(1 - value))


def point_to_segment_meters(point, start, end):
    lat0 = math.radians(point[0])
    scale_x = 6_371_000 * math.cos(lat0) * math.pi / 180
    scale_y = 6_371_000 * math.pi / 180
    px, py = 0.0, 0.0
    ax = (start[1] - point[1]) * scale_x
    ay = (start[0] - point[0]) * scale_y
    bx = (end[1] - point[1]) * scale_x
    by = (end[0] - point[0]) * scale_y
    dx, dy = bx - ax, by - ay
    length_squared = dx * dx + dy * dy
    ratio = 0 if length_squared == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / length_squared))
    return math.hypot(px - (ax + ratio * dx), py - (ay + ratio * dy))


def distance_to_route_meters(route, incident):
    coordinates = route["geometry"]["coordinates"]
    point = (incident["lat"], incident["lng"])
    distances = (
        point_to_segment_meters(point, (start[1], start[0]), (end[1], end[0]))
        for start, end in zip(coordinates, coordinates[1:])
    )
    return min(distances, default=float("inf"))


def score_routes(routes, incidents):
    enriched = []
    for index, route in enumerate(routes):
        congestion_penalty = 0.0
        incident_penalty = 0.0
        affected_count = 0
        congestion = min(0.95, 0.16 + ((index * 0.13) % 0.34))
        for incident in incidents:
            distance = distance_to_route_meters(route, incident)
            radius = incident["radius_m"]
            if distance > radius:
                continue
            affected_count += 1
            proximity = max(0.15, 1 - distance / radius)
            penalty = INCIDENT_PENALTIES[incident["type"]][incident["severity"]] * proximity
            if incident["type"] == "Congestion":
                congestion_penalty += penalty
            else:
                incident_penalty += penalty
        congestion = min(0.95, congestion + min(0.8, congestion_penalty))
        incident_penalty = min(0.9, incident_penalty)
        route["congestion"] = congestion
        route["incident_penalty"] = incident_penalty
        route["affected_incidents"] = affected_count
        route["adjusted_duration"] = route["duration"] * (1 + congestion * 0.75 + incident_penalty)
        enriched.append(route)

    metrics = {
        "time": [route["adjusted_duration"] for route in enriched],
        "distance": [route["distance"] for route in enriched],
        "congestion": [route["congestion"] for route in enriched],
        "incidents": [route["incident_penalty"] for route in enriched],
    }
    for route in enriched:
        normalized = {}
        for key, values in metrics.items():
            low, high = min(values), max(values)
            normalized[key] = 0 if high == low else (route[{
                "time": "adjusted_duration",
                "distance": "distance",
                "congestion": "congestion",
                "incidents": "incident_penalty",
            }[key]] - low) / (high - low)
        route["score"] = sum(normalized[key] * weight for key, weight in ROUTE_WEIGHTS.items())
    return sorted(enriched, key=lambda route: route["score"])


def fetch_routes(pickup, destination):
    url = f"{OSRM_URL}/{pickup[1]},{pickup[0]};{destination[1]},{destination[0]}"
    response = requests.get(
        url,
        params={"alternatives": "true", "overview": "full", "geometries": "geojson", "steps": "false"},
        timeout=20,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("code") != "Ok" or not payload.get("routes"):
        raise ValueError("The routing service did not return any driving routes.")
    routes = []
    for index, item in enumerate(payload["routes"]):
        if item.get("distance", 0) <= 0 or item.get("duration", 0) <= 0:
            continue
        geometry = item.get("geometry", {}).get("coordinates", [])
        if len(geometry) < 2:
            continue
        routes.append({
            "id": f"route-{index + 1}",
            "label": f"Corridor {index + 1}",
            "distance": item["distance"],
            "duration": item["duration"],
            "geometry": {"coordinates": geometry},
        })
    if not routes:
        raise ValueError("The routing response contained no usable route geometry.")
    return routes


def fetch_hospitals(center):
    query = (
        f"[out:json][timeout:15];"
        f"(nwr[amenity=hospital](around:10000,{center[0]:.6f},{center[1]:.6f}););"
        "out center tags;"
    )
    response = requests.post(OVERPASS_URL, data=query, timeout=20)
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload.get("elements"), list):
        raise ValueError("The hospital service returned an incomplete response.")
    hospitals = []
    for item in payload["elements"]:
        tags = item.get("tags", {})
        location = item.get("center", {})
        lat = item.get("lat", location.get("lat"))
        lng = item.get("lon", location.get("lon"))
        if lat is not None and lng is not None:
            hospitals.append({
                "name": tags.get("name", "Unnamed hospital"),
                "lat": lat,
                "lng": lng,
            })
    return hospitals


def render_map(pickup, destination, routes, hospitals, incidents, selected_route):
    safe_data = json.dumps({
        "pickup": pickup,
        "destination": destination,
        "routes": routes,
        "hospitals": hospitals,
        "incidents": incidents,
        "selected": selected_route,
    }).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    map_html = f"""
    <!doctype html><html><head>
      <meta charset="utf-8">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
      <style>html,body,#map{{height:100%;margin:0}} .legend{{background:white;padding:8px 10px;line-height:1.7;border-radius:4px}}</style>
    </head><body><div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const data = {safe_data};
      const map = L.map('map').setView(data.pickup || [28.6139,77.2090], 12);
      L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png',
        {{maxZoom:19, attribution:'&copy; OpenStreetMap contributors'}}).addTo(map);
      const bounds = [];
      const addPoint = (point, title, color) => {{
        if (!point) return;
        const label = L.DomUtil.create('span');
        label.textContent = title;
        L.circleMarker(point, {{radius:8,color,fillColor:color,fillOpacity:0.9}}).bindTooltip(label).addTo(map);
        bounds.push(point);
      }};
      data.routes.forEach(route => {{
        const points = route.geometry.coordinates.map(([lng,lat]) => [lat,lng]);
        const recommended = route.id === data.routes[0]?.id;
        const selected = route.id === data.selected;
        L.polyline(points, {{color:recommended?'#16835d':selected?'#d34d32':'#6483a3',
          weight:recommended||selected?6:4,dashArray:recommended?null:'7 7'}})
          .bindTooltip(route.label + (recommended?' · recommended':'')).addTo(map);
        bounds.push(...points);
      }});
      addPoint(data.pickup,'Pickup','#2467a6');
      addPoint(data.destination,'Destination','#d34d32');
      data.hospitals.forEach(h => addPoint([h.lat,h.lng],h.name,'#8055a5'));
      data.incidents.forEach(i => addPoint([i.lat,i.lng],i.type+' · '+i.severity,'#d18a18'));
      if (bounds.length > 1) map.fitBounds(bounds,{{padding:[24,24],maxZoom:14}});
    </script></body></html>
    """
    components.html(map_html, height=480, scrolling=False)


st.set_page_config(page_title="AI Emergency Corridor", page_icon="🚑", layout="wide")
st.title("AI Emergency Corridor")
st.caption("Training and demonstration dashboard · Not for real emergency dispatch")
st.warning(
    "Route alternatives use public OSRM data. Congestion and incidents are simulated. "
    "Do not use these estimates for emergency response or dispatch decisions."
)

if "routes" not in st.session_state:
    st.session_state.routes = []
if "incidents" not in st.session_state:
    st.session_state.incidents = []
if "hospitals" not in st.session_state:
    st.session_state.hospitals = []
if "pickup" not in st.session_state:
    st.session_state.pickup = DEFAULT_PICKUP
if "destination" not in st.session_state:
    st.session_state.destination = None
if "selected_route" not in st.session_state:
    st.session_state.selected_route = None
if "pickup_lat_input" not in st.session_state:
    st.session_state.pickup_lat_input = st.session_state.pickup[0]
if "pickup_lng_input" not in st.session_state:
    st.session_state.pickup_lng_input = st.session_state.pickup[1]
if "destination_lat_input" not in st.session_state:
    st.session_state.destination_lat_input = st.session_state.destination[0] if st.session_state.destination else 28.5672
if "destination_lng_input" not in st.session_state:
    st.session_state.destination_lng_input = st.session_state.destination[1] if st.session_state.destination else 77.2100


def use_selected_hospital():
    hospital = st.session_state.hospitals[st.session_state.selected_hospital_index]
    st.session_state.destination = (hospital["lat"], hospital["lng"])
    st.session_state.destination_lat_input = hospital["lat"]
    st.session_state.destination_lng_input = hospital["lng"]
    st.session_state.routes = []


def update_pickup():
    st.session_state.pickup = (
        st.session_state.pickup_lat_input,
        st.session_state.pickup_lng_input,
    )
    st.session_state.routes = []
    st.session_state.hospitals = []


def update_destination():
    st.session_state.destination = (
        st.session_state.destination_lat_input,
        st.session_state.destination_lng_input,
    )
    st.session_state.routes = []


with st.sidebar:
    st.header("Dispatch setup")
    st.subheader("Pickup")
    pickup_lat = st.number_input("Pickup latitude", -90.0, 90.0, format="%.6f", key="pickup_lat_input", on_change=update_pickup)
    pickup_lng = st.number_input("Pickup longitude", -180.0, 180.0, format="%.6f", key="pickup_lng_input", on_change=update_pickup)
    st.subheader("Destination")
    dest_lat = st.number_input("Destination latitude", -90.0, 90.0, format="%.6f", key="destination_lat_input", on_change=update_destination)
    dest_lng = st.number_input("Destination longitude", -180.0, 180.0, format="%.6f", key="destination_lng_input", on_change=update_destination)
    if st.button("Find nearby hospitals", use_container_width=True):
        try:
            with st.spinner("Searching OpenStreetMap hospitals..."):
                st.session_state.hospitals = fetch_hospitals((pickup_lat, pickup_lng))
                st.session_state.selected_hospital_index = 0
            if not st.session_state.hospitals:
                st.info("No hospital locations were found within 10 km.")
        except (requests.RequestException, ValueError) as error:
            st.error(f"Unable to load hospitals: {html.escape(str(error))}")
    if st.session_state.hospitals:
        hospital_names = [f'{h["name"]} ({h["lat"]:.4f}, {h["lng"]:.4f})' for h in st.session_state.hospitals]
        st.selectbox(
            "Use hospital as destination",
            range(len(hospital_names)),
            format_func=lambda index: hospital_names[index],
            key="selected_hospital_index",
            on_change=use_selected_hospital,
        )
    if st.button("Find route alternatives", type="primary", use_container_width=True):
        pickup = (pickup_lat, pickup_lng)
        destination = (dest_lat, dest_lng)
        if haversine_meters(pickup, destination) < 30:
            st.error("Choose pickup and destination at least 30 metres apart.")
        else:
            try:
                with st.spinner("Requesting driving routes..."):
                    st.session_state.routes = fetch_routes(pickup, destination)
                st.session_state.pickup = pickup
                st.session_state.destination = destination
                st.session_state.selected_route = None
                st.rerun()
            except (requests.RequestException, ValueError) as error:
                st.error(f"Unable to load route alternatives: {html.escape(str(error))}")

    st.divider()
    st.subheader("Simulated road event")
    with st.form("incident_form"):
        incident_type = st.selectbox("Event type", list(INCIDENT_PENALTIES))
        severity = st.select_slider("Severity", ["Low", "Medium", "High"], value="Medium")
        incident_lat = st.number_input("Event latitude", -90.0, 90.0, float(pickup_lat), format="%.6f")
        incident_lng = st.number_input("Event longitude", -180.0, 180.0, float(pickup_lng), format="%.6f")
        incident_radius = st.number_input("Impact radius (metres)", 100, 5000, 400, step=100)
        add_incident = st.form_submit_button("Add simulated event")
    if add_incident:
        st.session_state.incidents.append({
            "type": incident_type,
            "severity": severity,
            "lat": incident_lat,
            "lng": incident_lng,
            "radius_m": incident_radius,
        })
        st.rerun()
    if st.session_state.incidents:
        incident_to_remove = st.selectbox(
            "Event to remove",
            range(len(st.session_state.incidents)),
            format_func=lambda index: f'{st.session_state.incidents[index]["type"]} · {st.session_state.incidents[index]["severity"]} #{index + 1}',
        )
        if st.button("Remove selected event", use_container_width=True):
            st.session_state.incidents.pop(incident_to_remove)
            st.rerun()

pickup = (pickup_lat, pickup_lng)
destination = st.session_state.destination or (dest_lat, dest_lng)
routes = score_routes(st.session_state.routes, st.session_state.incidents)
if routes:
    st.session_state.selected_route = st.session_state.selected_route or routes[0]["id"]
    route_ids = [route["id"] for route in routes]
    if st.session_state.selected_route not in route_ids:
        st.session_state.selected_route = routes[0]["id"]
    recommended = routes[0]
    selected = next(route for route in routes if route["id"] == st.session_state.selected_route)
    map_col, control_col = st.columns([1.65, 1])
    with map_col:
        st.subheader("Corridor map")
        render_map(pickup, destination, routes, st.session_state.hospitals, st.session_state.incidents, selected["id"])
        st.caption("Routes from OSRM · Map tiles and hospital records from OpenStreetMap.")
    with control_col:
        st.subheader("Recommended corridor")
        st.success(f'{recommended["label"]} · lowest weighted score')
        st.write("Recommendation weighs estimated travel time, distance, simulated congestion, and simulated event impact.")
        st.radio(
            "Review a route",
            route_ids,
            format_func=lambda route_id: next(route["label"] for route in routes if route["id"] == route_id),
            key="selected_route",
        )
        selected = next(route for route in routes if route["id"] == st.session_state.selected_route)
        st.metric("Estimated distance", f'{selected["distance"] / 1000:.1f} km')
        st.metric("Adjusted time", f'{selected["adjusted_duration"] / 60:.0f} min')
        st.metric("Weighted score", f'{selected["score"]:.3f}')
        st.caption(f'{selected["affected_incidents"]} simulated event(s) near this route.')

    st.subheader("Route comparison")
    st.dataframe(
        [
            {
                "Rank": index + 1,
                "Corridor": route["label"],
                "Recommendation": "Recommended" if index == 0 else "",
                "Distance (km)": round(route["distance"] / 1000, 2),
                "Adjusted time (min)": round(route["adjusted_duration"] / 60),
                "Simulated congestion": f'{route["congestion"]:.0%}',
                "Nearby events": route["affected_incidents"],
                "Score": round(route["score"], 3),
            }
            for index, route in enumerate(routes)
        ],
        hide_index=True,
        use_container_width=True,
    )
else:
    st.info("Set corridor coordinates in the sidebar, then choose **Find route alternatives** to begin.")
    render_map(pickup, destination, [], st.session_state.hospitals, st.session_state.incidents, None)

with st.expander("Data and safety notes"):
    st.markdown(
        "- Driving route geometry and estimates are requested from the public OSRM demo server.\n"
        "- Nearby hospitals are queried from OpenStreetMap through Overpass.\n"
        "- Congestion scores and road events are illustrative simulations, not live traffic information.\n"
        "- Public services may be rate-limited or unavailable; errors are shown rather than silently replaced."
    )
