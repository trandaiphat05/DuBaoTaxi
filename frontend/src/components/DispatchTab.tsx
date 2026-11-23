import React, { useState, useRef } from 'react';
import {
  Coordinate,
  DispatchPassengerRequest,
  DispatchResponse,
} from '../types';
import { PRESET_LOCATIONS } from '../constants/presets';
import { calculateDispatchSchedule } from '../services/api';
import {
  Users,
  Car,
  Sparkles,
  TrendingDown,
  AlertCircle,
  ShieldCheck,
  ListOrdered,
  Plus,
  Trash2,
  RefreshCw,
  Info,
} from 'lucide-react';

interface DispatchTabProps {
  vehicleStart: Coordinate;
  onSetVehicleStart: (coord: Coordinate) => void;
  requests: DispatchPassengerRequest[];
  onSetRequests: (reqs: DispatchPassengerRequest[]) => void;
  result: DispatchResponse | null;
  onSetResult: (res: DispatchResponse | null) => void;
}

const COLOR_PALETTE = ['#2563EB', '#7C3AED', '#059669', '#D97706'];

export const DispatchTab: React.FC<DispatchTabProps> = ({
  vehicleStart,
  onSetVehicleStart,
  requests,
  onSetRequests,
  result,
  onSetResult,
}) => {
  const [capacity, setCapacity] = useState<number>(4);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Anti race-condition AbortController
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleRunDispatch = async () => {
    if (requests.length === 0) {
      setErrorMsg('Vui lòng thêm ít nhất 1 yêu cầu đặt xe.');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await calculateDispatchSchedule(
        vehicleStart,
        requests,
        capacity,
        abortController.signal
      );
      onSetResult(res);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      setErrorMsg(err.message || 'Lỗi khi giải bài toán điều phối đón khách.');
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleStartChange = (presetId: string) => {
    const p = PRESET_LOCATIONS.find((loc) => loc.id === presetId);
    if (p) {
      onSetVehicleStart({ lat: p.lat, lon: p.lon });
      onSetResult(null); // Reset kết quả khi đổi vị trí xe
      setErrorMsg(null);
    }
  };

  const handleCapacityChange = (newCap: number) => {
    setCapacity(newCap);
    onSetResult(null); // Reset kết quả khi đổi sức chứa xe
    setErrorMsg(null);
  };

  const handleAddRequest = () => {
    if (requests.length >= 4) {
      return;
    }
    const nextId = requests.length > 0 ? Math.max(...requests.map((r) => r.id)) + 1 : 1;
    const color = COLOR_PALETTE[(nextId - 1) % COLOR_PALETTE.length];
    
    // Pick different presets
    const p1 = PRESET_LOCATIONS[nextId % PRESET_LOCATIONS.length];
    const p2 = PRESET_LOCATIONS[(nextId + 2) % PRESET_LOCATIONS.length];

    const newReq: DispatchPassengerRequest = {
      id: nextId,
      name: `Khách ${nextId}`,
      pickup: { lat: p1.lat, lon: p1.lon },
      dropoff: { lat: p2.lat, lon: p2.lon },
      passengers: 1,
      color,
    };

    onSetRequests([...requests, newReq]);
    onSetResult(null); // Reset kết quả khi thêm yêu cầu
    setErrorMsg(null);
  };

  const handleDeleteRequest = (id: number) => {
    if (requests.length <= 1) return;
    const updated = requests.filter((r) => r.id !== id);
    onSetRequests(updated);
    onSetResult(null); // Reset kết quả khi xóa yêu cầu
    setErrorMsg(null);
  };

  const handleUpdateRequest = (
    id: number,
    field: 'pickup' | 'dropoff' | 'passengers',
    value: any
  ) => {
    const updated = requests.map((req) => {
      if (req.id !== id) return req;
      if (field === 'passengers') {
        return { ...req, passengers: value };
      }
      const preset = PRESET_LOCATIONS.find((p) => p.id === value);
      if (!preset) return req;
      return {
        ...req,
        [field]: { lat: preset.lat, lon: preset.lon },
      };
    });
    onSetRequests(updated);
    onSetResult(null); // Reset kết quả khi chỉnh sửa yêu cầu
    setErrorMsg(null);
  };

  const formatSecondsToMinutes = (sec: number) => {
    const totalSecs = Math.round(sec);
    const mins = Math.floor(totalSecs / 60);
    const remainingSecs = totalSecs % 60;
    return `${mins}p ${remainingSecs < 10 ? '0' + remainingSecs : remainingSecs}s`;
  };

  const findPresetId = (coord: Coordinate) => {
    const match = PRESET_LOCATIONS.find(
      (p) => Math.abs(p.lat - coord.lat) < 0.001 && Math.abs(p.lon - coord.lon) < 0.001
    );
    return match ? match.id : '';
  };

  return (
    <div className="space-y-5">
      {/* Tab Header */}
      <div className="border-b border-slate-200 pb-3">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Car className="w-5 h-5 text-blue-600" />
          Điều Phối Đón Nhiều Khách (Ride-Pooling)
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Tối ưu hóa thứ tự đón và trả khách trên cùng 1 xe, ràng buộc nghiêm ngặt sức chứa xe (Capacity) và so sánh với lộ trình tuần tự truyền thống.
        </p>
      </div>

      {/* Vehicle and Capacity Settings */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
              <Car className="w-3.5 h-3.5 text-blue-600" />
              Vị trí xe ban đầu:
            </label>
            <select
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => handleVehicleStartChange(e.target.value)}
              value={findPresetId(vehicleStart) || 'grand_central'}
            >
              {PRESET_LOCATIONS.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-amber-600" />
              Sức chứa xe (Chỗ ngồi):
            </label>
            <input
              type="number"
              min="2"
              max="6"
              value={capacity}
              onChange={(e) => handleCapacityChange(Math.min(6, Math.max(2, parseInt(e.target.value) || 4)))}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Requests List Header with Add Button */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>Danh sách yêu cầu ({requests.length}/4)</span>
            </span>
            <button
              type="button"
              onClick={handleAddRequest}
              disabled={requests.length >= 4}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all ${
                requests.length >= 4
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              + Thêm yêu cầu
            </button>
          </div>

          {requests.length >= 4 && (
            <div className="mb-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Hệ thống hỗ trợ tối đa 4 yêu cầu đón trả đồng thời để đảm bảo thời gian phản hồi tức thì.</span>
            </div>
          )}

          <div className="space-y-2.5">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex flex-col gap-2 relative group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: req.color }}
                    />
                    <span className="font-bold text-slate-800">{req.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <label className="text-[11px] text-slate-500">Khách:</label>
                      <input
                        type="number"
                        min="1"
                        max="4"
                        value={req.passengers}
                        onChange={(e) =>
                          handleUpdateRequest(
                            req.id,
                            'passengers',
                            Math.min(4, Math.max(1, parseInt(e.target.value) || 1))
                          )
                        }
                        className="w-12 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-center text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    {requests.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRequest(req.id)}
                        title="Xóa yêu cầu này"
                        aria-label={`Xóa ${req.name}`}
                        className="px-1.5 py-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Dropdowns for Pickup & Dropoff */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-emerald-700 font-semibold block mb-0.5">
                      Điểm đón:
                    </label>
                    <select
                      value={findPresetId(req.pickup) || ''}
                      onChange={(e) => handleUpdateRequest(req.id, 'pickup', e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      {PRESET_LOCATIONS.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-rose-700 font-semibold block mb-0.5">
                      Điểm trả:
                    </label>
                    <select
                      value={findPresetId(req.dropoff) || ''}
                      onChange={(e) => handleUpdateRequest(req.id, 'dropoff', e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    >
                      {PRESET_LOCATIONS.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleRunDispatch}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Đang giải bài toán phân bổ lộ trình...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Tối Ưu Hóa Lộ Trình Ghép Khách</span>
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
                onClick={handleRunDispatch}
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
        <div className="space-y-4">
          {/* Comparison Baseline Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-emerald-600" />
                Hiệu Quả So Với Đi Tuần Tự (Sequential)
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                Tiết kiệm {result.time_saved_percent}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-2xs">
                <span className="text-[11px] font-medium text-slate-500 block">Lộ trình ghép khách tối ưu</span>
                <div className="text-lg font-black text-blue-900 mt-0.5">
                  {formatSecondsToMinutes(result.total_duration_seconds)}
                </div>
                <span className="text-[10px] text-slate-500">
                  Quãng đường: ~{(result.total_distance_meters / 1000).toFixed(1)} km
                </span>
              </div>

              <div className="bg-white/80 rounded-lg p-3 border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-medium text-slate-500 block">Chở riêng từng khách</span>
                <div className="text-lg font-black text-slate-600 mt-0.5">
                  {formatSecondsToMinutes(result.sequential_duration_seconds)}
                </div>
                <span className="text-[10px] text-slate-500">
                  Quãng đường lặp: ~{((result.sequential_distance_meters || result.total_distance_meters * 1.5) / 1000).toFixed(1)} km
                </span>
              </div>
            </div>

            <div className="mt-3 text-xs text-blue-900 bg-blue-100/60 rounded-lg p-2.5 flex items-center gap-2 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Thời gian toàn trình giảm được <b>{formatSecondsToMinutes(result.time_saved_seconds)}</b> nhờ gộp lộ trình thông minh!
              </span>
            </div>
          </div>

          {/* Timeline Table Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <ListOrdered className="w-4 h-4 text-indigo-600" />
                Lịch Trình Chi Tiết Các Điểm Dừng
              </span>
              <span className="text-[11px] text-slate-500">Sức chứa tối đa: {capacity} khách</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                    <th className="py-2 px-2 text-center w-10">Bước</th>
                    <th className="py-2 px-2">Hành động</th>
                    <th className="py-2 px-2">Hành khách</th>
                    <th className="py-2 px-2 text-center">Tải trọng xe</th>
                    <th className="py-2 px-2 text-right">Lũy kế</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.stops.map((stop) => (
                    <tr key={stop.step} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-2 text-center font-bold text-slate-700">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[11px]">
                          {stop.step}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        {stop.event === 'pickup' ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Đón khách
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Trả khách
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 font-medium text-slate-800">
                        {stop.passenger_name}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <div className="inline-flex items-center gap-1 font-bold text-slate-700">
                          <span>{stop.load}/{capacity}</span>
                          <div className="w-12 bg-slate-200 h-2 rounded-full overflow-hidden inline-block">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all"
                              style={{ width: `${(stop.load / capacity) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                        {formatSecondsToMinutes(stop.cumulative_duration_seconds)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
