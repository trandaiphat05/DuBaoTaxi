import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Coordinate, GeoJSONLineString, TabType, MarkerSelectionMode } from '../types';
import { PRESET_LOCATIONS, MANHATTAN_CENTER } from '../constants/presets';
import { MapPin } from 'lucide-react';

interface MapComponentProps {
  activeTab: TabType;
  pickup: Coordinate | null;
  dropoff: Coordinate | null;
  vehicleStart: Coordinate | null;
  selectionMode: MarkerSelectionMode;
  onMapClick: (coord: Coordinate) => void;
  onSelectPreset: (preset: typeof PRESET_LOCATIONS[0], target: 'pickup' | 'dropoff') => void;
  routingGeoJSON?: GeoJSONLineString | null;
  dispatchStops?: Array<{
    step: number;
    event: 'start' | 'pickup' | 'dropoff';
    passenger_name?: string;
    location: Coordinate;
    load: number;
  }>;
  dispatchLegs?: [number, number][][];
}

// Custom Leaflet Icons using SVG Data URIs
const createPinIcon = (color: string, label?: string, textColor = 'white') => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
      <defs>
        <filter id="shadow" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000000" flood-opacity="0.35"/>
        </filter>
      </defs>
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 28 18 28s18-14.5 18-28C36 8.06 27.94 0 18 0z" fill="${color}" filter="url(#shadow)" stroke="#FFFFFF" stroke-width="2"/>
      <circle cx="18" cy="18" r="11" fill="#FFFFFF"/>
      <text x="18" y="22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="bold" fill="${textColor}" text-anchor="middle">${label || ''}</text>
    </svg>
  `;
  return L.divIcon({
    html: `<div class="custom-pin"><div class="custom-pin-inner">${svg}</div></div>`,
    className: '',
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -42],
  });
};

const greenPickupIcon = createPinIcon('#10B981', 'Đ', '#065F46'); // Green pin for pickup
const redDropoffIcon = createPinIcon('#EF4444', 'T', '#991B1B');  // Red pin for dropoff
const yellowVehicleIcon = createPinIcon('#F59E0B', '🚖', '#92400E'); // Taxi start pin

const createStopIcon = (step: number, event: 'start' | 'pickup' | 'dropoff') => {
  const bg = event === 'pickup' ? '#10B981' : event === 'dropoff' ? '#EF4444' : '#F59E0B';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <defs>
        <filter id="sh" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.4"/>
        </filter>
      </defs>
      <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26C32 7.16 24.84 0 16 0z" fill="${bg}" filter="url(#sh)" stroke="#FFFFFF" stroke-width="2"/>
      <circle cx="16" cy="16" r="10" fill="#FFFFFF"/>
      <text x="16" y="20" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="800" fill="${bg}" text-anchor="middle">${step}</text>
    </svg>
  `;
  return L.divIcon({
    html: `<div class="custom-pin"><div class="custom-pin-inner">${svg}</div></div>`,
    className: '',
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -38],
  });
};

export const MapComponent: React.FC<MapComponentProps> = ({
  activeTab,
  pickup,
  dropoff,
  vehicleStart,
  selectionMode,
  onMapClick,
  onSelectPreset,
  routingGeoJSON,
  dispatchStops,
  dispatchLegs,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const selectionModeRef = useRef(selectionMode);

  // Keep selectionModeRef synchronized
  useEffect(() => {
    selectionModeRef.current = selectionMode;
  }, [selectionMode]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [MANHATTAN_CENTER.lat, MANHATTAN_CENTER.lon],
      zoom: 13,
      zoomControl: false,
    });

    // Clean OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Zoom control on top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    const routesGroup = L.layerGroup().addTo(map);

    markersLayerRef.current = markersGroup;
    routesLayerRef.current = routesGroup;
    mapInstanceRef.current = map;

    // Handle map click
    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClick({
        lat: +e.latlng.lat.toFixed(6),
        lon: +e.latlng.lng.toFixed(6),
      });
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers & Polylines whenever inputs change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    const routesGroup = routesLayerRef.current;
    if (!map || !markersGroup || !routesGroup) return;

    markersGroup.clearLayers();
    routesGroup.clearLayers();

    const boundsPoints: [number, number][] = [];

    // Mode: Prediction or Routing
    if (activeTab === 'prediction' || activeTab === 'routing') {
      if (pickup) {
        boundsPoints.push([pickup.lat, pickup.lon]);
        const m = L.marker([pickup.lat, pickup.lon], { icon: greenPickupIcon })
          .bindPopup(`<b>Điểm đón khách</b><br/>Tọa độ: ${pickup.lat}, ${pickup.lon}`)
          .addTo(markersGroup);
        if (selectionMode === 'pickup') m.openPopup();
      }

      if (dropoff) {
        boundsPoints.push([dropoff.lat, dropoff.lon]);
        const m = L.marker([dropoff.lat, dropoff.lon], { icon: redDropoffIcon })
          .bindPopup(`<b>Điểm trả khách</b><br/>Tọa độ: ${dropoff.lat}, ${dropoff.lon}`)
          .addTo(markersGroup);
        if (selectionMode === 'dropoff') m.openPopup();
      }

      // Draw A* Route Line
      if (routingGeoJSON && routingGeoJSON.coordinates && routingGeoJSON.coordinates.length > 0) {
        const latLngs = routingGeoJSON.coordinates.map((c) => [c[1], c[0]] as [number, number]);
        latLngs.forEach((p) => boundsPoints.push(p));

        // Glow outline
        L.polyline(latLngs, {
          color: '#065F46',
          weight: 7,
          opacity: 0.4,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routesGroup);

        // Vibrant main line
        L.polyline(latLngs, {
          color: '#10B981',
          weight: 4.5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routesGroup);
      }
    }

    // Mode: Dispatch
    if (activeTab === 'dispatch') {
      if (vehicleStart) {
        boundsPoints.push([vehicleStart.lat, vehicleStart.lon]);
        L.marker([vehicleStart.lat, vehicleStart.lon], { icon: yellowVehicleIcon })
          .bindPopup(`<b>Vị trí xuất phát của xe</b><br/>Tọa độ: ${vehicleStart.lat}, ${vehicleStart.lon}`)
          .addTo(markersGroup);
      }

      if (dispatchStops && dispatchStops.length > 0) {
        dispatchStops.forEach((stop) => {
          boundsPoints.push([stop.location.lat, stop.location.lon]);
          const stopIcon = createStopIcon(stop.step, stop.event);
          const stopDesc =
            stop.event === 'pickup'
              ? `Điểm đón: <b>${stop.passenger_name || 'Khách'}</b> (Xe đang chở: ${stop.load} khách)`
              : `Điểm trả: <b>${stop.passenger_name || 'Khách'}</b> (Xe còn: ${stop.load} khách)`;
          L.marker([stop.location.lat, stop.location.lon], { icon: stopIcon })
            .bindPopup(`<b>Bước ${stop.step}: ${stop.event === 'pickup' ? 'Đón khách' : 'Trả khách'}</b><br/>${stopDesc}`)
            .addTo(markersGroup);
        });
      }

      if (dispatchLegs && dispatchLegs.length > 0) {
        dispatchLegs.forEach((leg, index) => {
          const colors = ['#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#059669', '#0891B2'];
          const legColor = colors[index % colors.length];

          // Glow outline
          L.polyline(leg, {
            color: '#1E293B',
            weight: 6,
            opacity: 0.35,
            lineCap: 'round',
          }).addTo(routesGroup);

          // Path with dashed styling to distinguish shared trip stages
          L.polyline(leg, {
            color: legColor,
            weight: 4,
            opacity: 0.9,
            dashArray: '8, 6',
            lineCap: 'round',
          }).addTo(routesGroup);
        });
      }
    }

    // Adjust view to fit all points smoothly if there are multiple markers
    if (boundsPoints.length >= 2) {
      map.fitBounds(L.latLngBounds(boundsPoints), {
        padding: [60, 60],
        maxZoom: 15,
        animate: true,
      });
    }
  }, [activeTab, pickup, dropoff, vehicleStart, routingGeoJSON, dispatchStops, dispatchLegs]);

  return (
    <div className="relative w-full h-full min-h-[350px] overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-slate-100">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" id="manhattan-map" />

      {/* Preset Manhattan Quick-Select Chips (Top Overlay) */}
      <div className="absolute top-3 left-3 right-14 z-[500] flex flex-wrap gap-1.5 items-center pointer-events-auto bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl shadow-md border border-slate-200/80">
        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1 mr-1">
          <MapPin className="w-3.5 h-3.5 text-amber-500" /> Địa điểm mẫu:
        </span>
        {PRESET_LOCATIONS.map((preset) => (
          <div key={preset.id} className="relative group flex items-center">
            <button
              onClick={() => onSelectPreset(preset, 'pickup')}
              title={`${preset.name}: Bấm để chọn làm điểm đón`}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 transition-all flex items-center gap-1 shadow-xs"
            >
              <span>{preset.name}</span>
            </button>
            <div className="hidden group-hover:flex absolute top-full left-0 mt-1 z-[600] bg-white rounded-lg shadow-xl border border-slate-200 p-1 flex-col gap-1 min-w-[130px]">
              <button
                onClick={() => onSelectPreset(preset, 'pickup')}
                className="w-full text-left px-2 py-1 text-xs rounded hover:bg-emerald-50 text-emerald-700 font-medium flex items-center gap-1"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Đặt làm điểm đón
              </button>
              <button
                onClick={() => onSelectPreset(preset, 'dropoff')}
                className="w-full text-left px-2 py-1 text-xs rounded hover:bg-rose-50 text-rose-700 font-medium flex items-center gap-1"
              >
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                Đặt làm điểm trả
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Selection Mode Notice Badge */}
      {selectionMode && (
        <div className="absolute bottom-4 left-4 z-[500] pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur text-white px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 shadow-lg border border-slate-700 animate-pulse">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                selectionMode === 'pickup'
                  ? 'bg-emerald-400'
                  : selectionMode === 'dropoff'
                  ? 'bg-rose-400'
                  : 'bg-amber-400'
              }`}
            />
            {selectionMode === 'pickup' && 'Nhấp chuột trên bản đồ để chọn Điểm Đón'}
            {selectionMode === 'dropoff' && 'Nhấp chuột trên bản đồ để chọn Điểm Trả'}
            {selectionMode === 'dispatch_pickup' && 'Nhấp chuột trên bản đồ để đặt điểm đón cho khách'}
            {selectionMode === 'dispatch_dropoff' && 'Nhấp chuột trên bản đồ để đặt điểm trả cho khách'}
          </div>
        </div>
      )}

      {/* Legend Badge (Bottom Right) */}
      <div className="absolute bottom-3 right-3 z-[500] bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-md border border-slate-200 text-[11px] font-medium text-slate-700 space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 border border-white shadow-xs" />
          <span>Điểm đón khách</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500 border border-white shadow-xs" />
          <span>Điểm trả khách</span>
        </div>
        {activeTab === 'dispatch' && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500 border border-white shadow-xs" />
            <span>Vị trí xe xuất phát</span>
          </div>
        )}
      </div>
    </div>
  );
};
