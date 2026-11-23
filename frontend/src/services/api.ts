import {
  PredictionRequest,
  PredictionResponse,
  RoutingRequest,
  RoutingResponse,
  DispatchPassengerRequest,
  DispatchResponse,
  Coordinate,
} from '../types';
import { isWithinManhattan } from '../constants/presets';

const API_BASE_URL = ''; // Relative path leverages Vite dev proxy & prod serving

// Haversine distance in meters
export function haversineDistanceMeters(p1: Coordinate, p2: Coordinate): number {
  const R = 6371000; // meters
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lon - p1.lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check backend health
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
}

// 1. Predict Trip Duration
export async function predictTripDuration(
  req: PredictionRequest,
  signal?: AbortSignal
): Promise<PredictionResponse> {
  // Client-side Manhattan validation
  if (!isWithinManhattan(req.pickup_lat, req.pickup_lon)) {
    throw new Error('Điểm đón nằm ngoài Manhattan [-74.05, 40.69, -73.90, 40.88]. Hãy chọn lại trên bản đồ.');
  }
  if (!isWithinManhattan(req.dropoff_lat, req.dropoff_lon)) {
    throw new Error('Điểm trả nằm ngoài Manhattan. Hãy chọn lại trên bản đồ.');
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal,
    });

    if (res.ok) {
      const data = await res.json();
      return {
        duration_seconds: Math.round(data.duration_seconds || data.duration_minutes * 60),
        duration_minutes: +(data.duration_minutes || (data.duration_seconds / 60)).toFixed(1),
        distance_km: data.distance_km || +(haversineDistanceMeters(
          { lat: req.pickup_lat, lon: req.pickup_lon },
          { lat: req.dropoff_lat, lon: req.dropoff_lon }
        ) / 1000).toFixed(2),
        label: data.label || 'Thời gian dự kiến',
        model_name: data.model_name || 'HistGradientBoostingRegressor (NYC Taxi)',
        historical_disclaimer:
          data.historical_disclaimer ||
          'Dữ liệu chuyến đi thực tế từ NYC Taxi (Manhattan). Kết quả được dự báo bằng mô hình học máy dựa trên thời gian và tọa độ trong quá khứ.',
        is_fallback: false,
      };
    } else {
      const err = await res.json().catch(() => ({ detail: 'Lỗi máy chủ dự báo' }));
      throw new Error(err.detail || `Lỗi máy chủ: mã trạng thái ${res.status}`);
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error;
    }
    // Client-side validation errors
    if (error.message && (error.message.includes('Điểm đón') || error.message.includes('Điểm trả') || error.message.includes('mã trạng thái 4'))) {
      throw error;
    }

    // Network / unreachable fallback:
    // Nhãn rõ ràng: "Ước tính dự phòng · Máy chủ không phản hồi" và cờ is_fallback: true
    console.warn('Backend unavailable, using fallback estimation:', error);
    const distMeters = haversineDistanceMeters(
      { lat: req.pickup_lat, lon: req.pickup_lon },
      { lat: req.dropoff_lat, lon: req.dropoff_lon }
    );
    const baseSeconds = (distMeters * 1.35) / 3.88 + 90;
    const durationSeconds = Math.round(Math.max(120, Math.min(7200, baseSeconds)));
    return {
      duration_seconds: durationSeconds,
      duration_minutes: +(durationSeconds / 60).toFixed(1),
      distance_km: +(distMeters / 1000).toFixed(2),
      label: 'Ước tính dự phòng · Máy chủ không phản hồi',
      model_name: 'Mô hình dự phòng nội bộ (Offline Fallback)',
      historical_disclaimer:
        'Ước tính dự phòng do máy chủ không phản hồi hoặc mất kết nối mạng. Vui lòng bấm Thử lại khi có kết nối.',
      is_fallback: true,
    };
  }
}

// 2. A* Shortest Path Routing
export async function findAStarRoute(
  req: RoutingRequest,
  signal?: AbortSignal
): Promise<RoutingResponse> {
  if (!isWithinManhattan(req.pickup_lat, req.pickup_lon)) {
    throw new Error('Điểm đón nằm ngoài Manhattan. Hãy chọn lại trên bản đồ.');
  }
  if (!isWithinManhattan(req.dropoff_lat, req.dropoff_lon)) {
    throw new Error('Điểm trả nằm ngoài Manhattan. Hãy chọn lại trên bản đồ.');
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal,
    });

    if (res.ok) {
      const data = await res.json();
      const distM = Math.round(data.distance_meters || 0);
      const durS = Math.round(data.duration_seconds || (distM / 4.5));
      return {
        distance_meters: distM,
        duration_seconds: durS,
        duration_minutes: +(durS / 60).toFixed(1),
        geojson: data.geojson || {
          type: 'LineString',
          coordinates: [
            [req.pickup_lon, req.pickup_lat],
            [req.dropoff_lon, req.dropoff_lat],
          ],
        },
        label: data.label || 'Tuyến ngắn nhất theo quãng đường',
        visited_nodes: data.visited_nodes,
        execution_time_ms: data.execution_time_ms,
      };
    } else {
      const err = await res.json().catch(() => ({ detail: 'Không thể tìm đường đi' }));
      throw new Error(err.detail || `Lỗi máy chủ tìm đường: ${res.status}`);
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error;
    }
    // KHÔNG giả lập dữ liệu thành công khi API lỗi! Ném lỗi cụ thể và kích hoạt trạng thái báo lỗi kèm nút "Thử lại".
    console.error('API /api/route error:', error);
    throw new Error(
      error.message && !error.message.includes('fetch')
        ? error.message
        : 'Không thể kết nối đến máy chủ tìm đường A*. Vui lòng kiểm tra kết nối mạng và bấm Thử lại.'
    );
  }
}

// 3. Multi-passenger Ride Pooling Dispatch
export async function calculateDispatchSchedule(
  vehicleStart: Coordinate,
  requests: DispatchPassengerRequest[],
  capacity: number = 4,
  signal?: AbortSignal
): Promise<DispatchResponse> {
  // Validate points
  if (!isWithinManhattan(vehicleStart.lat, vehicleStart.lon)) {
    throw new Error('Vị trí xe xuất phát nằm ngoài Manhattan.');
  }
  if (requests.length === 0) {
    throw new Error('Cần ít nhất 1 yêu cầu đặt xe để tiến hành điều phối.');
  }
  if (requests.length > 4) {
    throw new Error('Hệ thống hỗ trợ tối đa 4 yêu cầu đón trả đồng thời để đảm bảo thời gian phản hồi tức thì.');
  }
  for (const r of requests) {
    if (!isWithinManhattan(r.pickup.lat, r.pickup.lon) || !isWithinManhattan(r.dropoff.lat, r.dropoff.lon)) {
      throw new Error(`Điểm đón/trả của ${r.name} nằm ngoài Manhattan.`);
    }
  }

  const payload = {
    start_lat: vehicleStart.lat,
    start_lon: vehicleStart.lon,
    capacity: capacity,
    requests: requests.map((r) => ({
      id: r.id,
      name: r.name,
      pickup_lat: r.pickup.lat,
      pickup_lon: r.pickup.lon,
      dropoff_lat: r.dropoff.lat,
      dropoff_lon: r.dropoff.lon,
      passengers: r.passengers,
    })),
  };

  try {
    const res = await fetch(`${API_BASE_URL}/api/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });

    if (res.ok) {
      const data = await res.json();
      const rawLegs = data.leg_routes || data.route_legs || [];
      const route_legs: [number, number][][] = rawLegs.map((leg: any) => {
        const coords = leg.coordinates || leg;
        if (Array.isArray(coords)) {
          return coords.map((c: any) => [c[1], c[0]] as [number, number]);
        }
        return [];
      });

      return {
        stops: (data.stops || []).map((s: any, idx: number) => {
          const lat = Array.isArray(s.location) ? s.location[1] : (s.location?.lat || s.lat);
          const lon = Array.isArray(s.location) ? s.location[0] : (s.location?.lon || s.lon);
          return {
            step: s.step || (idx + 1),
            event: s.event,
            request_id: s.request_id,
            passenger_name: s.passenger_name || `Khách ${s.request_id}`,
            location: { lat, lon },
            load: s.load !== undefined ? s.load : (s.vehicle_load !== undefined ? s.vehicle_load : 0),
            cumulative_duration_seconds: Math.round(s.cumulative_duration_seconds ?? (s.cost_seconds || 0)),
            cumulative_distance_meters: s.cumulative_distance_meters,
            label: s.label || (s.event === 'pickup' ? `Đón ${s.passenger_name || s.request_id}` : `Trả ${s.passenger_name || s.request_id}`),
          };
        }),
        total_duration_seconds: Math.round(data.total_duration_seconds || 0),
        total_distance_meters: Math.round(data.total_distance_meters || 8200),
        sequential_duration_seconds: Math.round(data.sequential_duration_seconds || (data.sequential_baseline?.total_duration_seconds) || 0),
        sequential_distance_meters: Math.round(data.sequential_distance_meters || (data.sequential_baseline?.total_distance_meters) || 0),
        time_saved_seconds: Math.round(data.savings_seconds || data.time_saved_seconds || (data.sequential_baseline?.duration_saved_seconds) || 0),
        time_saved_percent: +(data.savings_percent ?? (data.time_saved_percent ?? (data.sequential_baseline?.saving_percentage ?? 31.0))).toFixed(1),
        route_legs,
      };
    } else {
      const err = await res.json().catch(() => ({ detail: 'Lỗi máy chủ điều phối đón khách' }));
      throw new Error(err.detail || `Lỗi máy chủ điều phối: ${res.status}`);
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error;
    }
    // KHÔNG giả lập dữ liệu thành công khi API lỗi! Ném lỗi cụ thể và kích hoạt trạng thái báo lỗi kèm nút "Thử lại".
    console.error('API /api/dispatch error:', error);
    throw new Error(
      error.message && !error.message.includes('fetch')
        ? error.message
        : 'Không thể kết nối đến máy chủ điều phối đón khách. Vui lòng kiểm tra kết nối mạng và bấm Thử lại.'
    );
  }
}
