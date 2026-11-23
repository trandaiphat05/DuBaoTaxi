export interface Coordinate {
  lat: number;
  lon: number;
}

export interface PresetLocation {
  id: string;
  name: string;
  vietnameseName: string;
  lat: number;
  lon: number;
  description: string;
}

export type TabType = 'prediction' | 'routing' | 'dispatch';

export type MarkerSelectionMode = 'pickup' | 'dropoff' | 'dispatch_pickup' | 'dispatch_dropoff' | null;

export interface PredictionRequest {
  pickup_lat: number;
  pickup_lon: number;
  dropoff_lat: number;
  dropoff_lon: number;
  pickup_datetime: string;
  passenger_count: number;
}

export interface PredictionResponse {
  duration_seconds: number;
  duration_minutes: number;
  distance_km?: number;
  label: string;
  model_name?: string;
  historical_disclaimer?: string;
  is_fallback?: boolean;
}

export interface RoutingRequest {
  pickup_lat: number;
  pickup_lon: number;
  dropoff_lat: number;
  dropoff_lon: number;
}

export interface GeoJSONLineString {
  type: string;
  coordinates: [number, number][]; // [lon, lat]
}

export interface RoutingResponse {
  distance_meters: number;
  duration_seconds: number;
  duration_minutes: number;
  geojson: GeoJSONLineString;
  label: string;
  visited_nodes?: number;
  execution_time_ms?: number;
}

export interface DispatchPassengerRequest {
  id: number;
  name: string;
  pickup: Coordinate;
  dropoff: Coordinate;
  passengers: number;
  color: string;
}

export interface DispatchStop {
  step: number;
  event: 'start' | 'pickup' | 'dropoff';
  request_id?: number;
  passenger_name?: string;
  location: Coordinate;
  load: number;
  cumulative_duration_seconds: number;
  cumulative_distance_meters?: number;
  label: string;
}

export interface DispatchResponse {
  stops: DispatchStop[];
  total_duration_seconds: number;
  total_distance_meters: number;
  sequential_duration_seconds: number;
  sequential_distance_meters?: number;
  time_saved_seconds: number;
  time_saved_percent: number;
  route_legs: [number, number][][]; // list of coordinate polylines [lat, lon]
}
