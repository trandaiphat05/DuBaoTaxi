import React from 'react';
import { TabType } from '../types';
import { Clock, Route, Car } from 'lucide-react';

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  backendOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  backendOnline,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shrink-0">
      <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 text-lg">
            🚖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-white">
                Hệ Thống Điều Phối & Dự Báo Taxi Manhattan
              </h1>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  backendOnline
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                    : 'bg-amber-950/80 text-amber-400 border border-amber-800'
                }`}
                title={backendOnline ? 'Kết nối máy chủ thành công' : 'Chế độ tính toán độc lập (Standalone)'}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {backendOnline ? 'Máy chủ trực tuyến' : 'Sẵn sàng'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Mô hình học máy dự báo thời gian & thuật toán định tuyến A* trên bản đồ Manhattan
            </p>
          </div>
        </div>

        {/* Tab Buttons (Header Navigation) */}
        <nav className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 shadow-inner">
          <button
            onClick={() => onTabChange('prediction')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'prediction'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Dự báo chuyến</span>
          </button>

          <button
            onClick={() => onTabChange('routing')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'routing'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span>Tìm đường</span>
          </button>

          <button
            onClick={() => onTabChange('dispatch')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'dispatch'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Đón nhiều khách</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
