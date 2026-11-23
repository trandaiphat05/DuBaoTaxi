import React, { useState, useRef } from 'react';
import {
  Coordinate,
  PredictionResponse,
  MarkerSelectionMode,
} from '../types';
import { PRESET_LOCATIONS } from '../constants/presets';
import { predictTripDuration } from '../services/api';
import {
  Clock,
  MapPin,
  Calendar,
  Users,
  AlertCircle,
  Sparkles,
  Info,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

interface PredictionTabProps {
  pickup: Coordinate | null;
  dropoff: Coordinate | null;
  selectionMode: MarkerSelectionMode;
  onSetSelectionMode: (mode: MarkerSelectionMode) => void;
  onSetPickup: (coord: Coordinate) => void;
  onSetDropoff: (coord: Coordinate) => void;
  result: PredictionResponse | null;
  onSetResult: (res: PredictionResponse | null) => void;
}

// Get current New York time (America/New_York) in YYYY-MM-DDTHH:mm format
export function getNewYorkCurrentDateTime(): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';
    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');
    const hour = getPart('hour');
    const minute = getPart('minute');
    return `${year}-${month}-${day}T${hour}:${minute}`;
  } catch {
    const d = new Date();
    return d.toISOString().slice(0, 16);
  }
}

export const PredictionTab: React.FC<PredictionTabProps> = ({
  pickup,
  dropoff,
  selectionMode,
  onSetSelectionMode,
  onSetPickup,
  onSetDropoff,
  result,
  onSetResult,
}) => {
  const [datetime, setDatetime] = useState<string>(() => getNewYorkCurrentDateTime());
  const [passengerCount, setPassengerCount] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Anti race-condition AbortController
  const abortControllerRef = useRef<AbortController | null>(null);

  const handlePredict = async () => {
    if (!pickup || !dropoff) {
      setErrorMsg('Vui lòng chọn đầy đủ cả điểm đón và điểm trả khách.');
      return;
    }

    // Cancel any ongoing prediction request to avoid race condition
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await predictTripDuration(
        {
          pickup_lat: pickup.lat,
          pickup_lon: pickup.lon,
          dropoff_lat: dropoff.lat,
          dropoff_lon: dropoff.lon,
          pickup_datetime: datetime,
          passenger_count: passengerCount,
        },
        abortController.signal
      );
      onSetResult(res);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return; // Ignore aborted requests
      }
      setErrorMsg(err.message || 'Đã xảy ra lỗi khi dự báo chuyến đi.');
    } finally {
      setLoading(false);
    }
  };

  const handlePresetChange = (presetId: string, type: 'pickup' | 'dropoff') => {
    const found = PRESET_LOCATIONS.find((p) => p.id === presetId);
    if (!found) return;
    onSetResult(null); // Reset old prediction results immediately
    if (type === 'pickup') {
      onSetPickup({ lat: found.lat, lon: found.lon });
    } else {
      onSetDropoff({ lat: found.lat, lon: found.lon });
    }
    setErrorMsg(null);
  };

  const handleDatetimeChange = (val: string) => {
    setDatetime(val);
    onSetResult(null); // Reset old result when datetime changes
    setErrorMsg(null);
  };

  const handlePassengerChange = (val: number) => {
    setPassengerCount(val);
    onSetResult(null); // Reset old result when passengers change
    setErrorMsg(null);
  };

  return (
    <div className="space-y-5">
      {/* Description header */}
      <div className="border-b border-slate-200 pb-3">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" />
          Dự Báo Thời Gian Chuyến Đi Taxi
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Ứng dụng mô hình học máy trên dữ liệu hành trình taxi Manhattan để dự báo chính xác thời gian hoàn thành chuyến.
        </p>
      </div>

      {/* Input Form Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4">
        {/* Pickup Location */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Điểm đón khách (Pickup):
            </label>
            <button
              type="button"
              onClick={() => onSetSelectionMode(selectionMode === 'pickup' ? null : 'pickup')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 border ${
                selectionMode === 'pickup'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <MapPin className="w-3 h-3" />
              {selectionMode === 'pickup' ? 'Đang chọn trên bản đồ...' : 'Chọn trên bản đồ'}
            </button>
          </div>
          <div className="flex gap-2">
            <select
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              onChange={(e) => handlePresetChange(e.target.value, 'pickup')}
              defaultValue=""
            >
              <option value="" disabled>-- Chọn địa điểm mẫu Manhattan --</option>
              {PRESET_LOCATIONS.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.vietnameseName})
                </option>
              ))}
            </select>
          </div>
          {pickup ? (
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              Tọa độ: {pickup.lat.toFixed(5)}, {pickup.lon.toFixed(5)}
            </div>
          ) : (
            <div className="text-[11px] text-amber-600 mt-1">Chưa chọn điểm đón</div>
          )}
        </div>

        {/* Dropoff Location */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              Điểm trả khách (Dropoff):
            </label>
            <button
              type="button"
              onClick={() => onSetSelectionMode(selectionMode === 'dropoff' ? null : 'dropoff')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 border ${
                selectionMode === 'dropoff'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <MapPin className="w-3 h-3" />
              {selectionMode === 'dropoff' ? 'Đang chọn trên bản đồ...' : 'Chọn trên bản đồ'}
            </button>
          </div>
          <div className="flex gap-2">
            <select
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              onChange={(e) => handlePresetChange(e.target.value, 'dropoff')}
              defaultValue=""
            >
              <option value="" disabled>-- Chọn địa điểm mẫu Manhattan --</option>
              {PRESET_LOCATIONS.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.vietnameseName})
                </option>
              ))}
            </select>
          </div>
          {dropoff ? (
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              Tọa độ: {dropoff.lat.toFixed(5)}, {dropoff.lon.toFixed(5)}
            </div>
          ) : (
            <div className="text-[11px] text-amber-600 mt-1">Chưa chọn điểm trả</div>
          )}
        </div>

        {/* Date Time & Passengers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Giờ khởi hành tại New York:
              </label>
            </div>
            <span className="text-[10px] text-slate-500 block mb-1">
              (Múi giờ New York - EDT/EST)
            </span>
            <input
              type="datetime-local"
              value={datetime}
              onChange={(e) => handleDatetimeChange(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              Số lượng hành khách:
            </label>
            <div className="flex items-center gap-2 mt-4">
              <input
                type="number"
                min="1"
                max="6"
                value={passengerCount}
                onChange={(e) => handlePassengerChange(Math.min(6, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-xs text-slate-500 whitespace-nowrap">người</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handlePredict}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <span>Đang tính toán dự báo...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Dự Báo Thời Gian Chuyến</span>
            </>
          )}
        </button>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Thông báo lỗi</p>
                <p>{errorMsg}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handlePredict}
                disabled={loading}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Thử lại
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Display */}
      {result && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-md p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              {result.is_fallback ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Ước tính dự phòng
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Kết quả dự báo
                </>
              )}
            </span>
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                result.is_fallback
                  ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {result.label || 'Thời gian dự kiến'}
            </span>
          </div>

          {/* Main Metric Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-100">
              <span className="text-[11px] font-medium text-amber-800 block">Thời gian dự kiến</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black text-amber-900">
                  {result.duration_minutes}
                </span>
                <span className="text-xs font-bold text-amber-700">phút</span>
              </div>
              <span className="text-[11px] text-amber-600 block mt-0.5">
                (~{result.duration_seconds.toLocaleString('vi-VN')} giây)
              </span>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <span className="text-[11px] font-medium text-slate-600 block">Quãng đường ước tính</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-800">
                  {result.distance_km || 0}
                </span>
                <span className="text-xs font-bold text-slate-600">km</span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Khoảng cách địa lý Manhattan
              </span>
            </div>
          </div>

          {/* Historical Data Disclaimer Card */}
          <div
            className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
              result.is_fallback
                ? 'bg-amber-100/90 border-amber-300 text-amber-950'
                : 'bg-amber-50/80 border-amber-200/80 text-amber-900'
            }`}
          >
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950">
                {result.is_fallback ? 'Cảnh báo mất kết nối máy chủ' : 'Lưu ý nguồn dữ liệu lịch sử'}
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                {result.historical_disclaimer ||
                  'Dữ liệu chuyến đi thực tế từ NYC Taxi (Manhattan). Kết quả được dự báo bằng mô hình học máy dựa trên thời gian và tọa độ trong quá khứ.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
