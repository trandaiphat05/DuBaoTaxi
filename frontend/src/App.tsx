import React, { useState, useEffect } from 'react';
import {
  TabType,
  Coordinate,
  MarkerSelectionMode,
  PredictionResponse,
  RoutingResponse,
  DispatchPassengerRequest,
  DispatchResponse,
} from './types';
import { PRESET_LOCATIONS } from './constants/presets';
import { checkBackendHealth } from './services/api';
import { Header } from './components/Header';
import { MapComponent } from './components/MapComponent';
import { PredictionTab } from './components/PredictionTab';
import { RoutingTab } from './components/RoutingTab';
import { DispatchTab } from './components/DispatchTab';
import { ChevronUp, ChevronDown, Sliders } from 'lucide-react';

const INITIAL_REQUESTS: DispatchPassengerRequest[] = [
  {
    id: 1,
    name: 'Khách 1 (Quảng trường Thời Đại ➔ Phố Wall)',
    pickup: { lat: 40.7580, lon: -73.9855 },
    dropoff: { lat: 40.7069, lon: -74.0090 },
    passengers: 1,
    color: '#2563EB',
  },
  {
    id: 2,
    name: 'Khách 2 (Ga Trung tâm ➔ SoHo)',
    pickup: { lat: 40.7527, lon: -73.9772 },
    dropoff: { lat: 40.7233, lon: -74.0030 },
    passengers: 2,
    color: '#7C3AED',
  },
  {
    id: 3,
    name: 'Khách 3 (Tòa nhà Empire State ➔ Công viên)',
    pickup: { lat: 40.7484, lon: -73.9857 },
    dropoff: { lat: 40.7660, lon: -73.9772 },
    passengers: 1,
    color: '#059669',
  },
];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('prediction');
  const [backendOnline, setBackendOnline] = useState<boolean>(false);

  // Common Map Marker Coordinates
  const [pickup, setPickup] = useState<Coordinate | null>({ lat: 40.7580, lon: -73.9855 }); // Times Square
  const [dropoff, setDropoff] = useState<Coordinate | null>({ lat: 40.7069, lon: -74.0090 }); // Wall Street
  const [vehicleStart, setVehicleStart] = useState<Coordinate>({ lat: 40.7527, lon: -73.9772 }); // Grand Central

  // Click Selection Mode
  const [selectionMode, setSelectionMode] = useState<MarkerSelectionMode>(null);

  // Results state
  const [predictionResult, setPredictionResult] = useState<PredictionResponse | null>(null);
  const [routingResult, setRoutingResult] = useState<RoutingResponse | null>(null);
  const [dispatchRequests, setDispatchRequests] = useState<DispatchPassengerRequest[]>(INITIAL_REQUESTS);
  const [dispatchResult, setDispatchResult] = useState<DispatchResponse | null>(null);

  // Mobile Bottom Drawer State
  const [isMobileDrawerExpanded, setIsMobileDrawerExpanded] = useState<boolean>(false);

  // Health check on mount and interval
  useEffect(() => {
    checkBackendHealth().then((ok) => setBackendOnline(ok));
    const timer = setInterval(() => {
      checkBackendHealth().then((ok) => setBackendOnline(ok));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Handle map clicks based on active selection mode
  const handleMapClick = (coord: Coordinate) => {
    // Reset old results immediately when coordinates change on map
    if (activeTab === 'prediction') {
      setPredictionResult(null);
    } else if (activeTab === 'routing') {
      setRoutingResult(null);
    } else if (activeTab === 'dispatch') {
      setDispatchResult(null);
    }

    if (selectionMode === 'pickup') {
      setPickup(coord);
      setSelectionMode(null);
    } else if (selectionMode === 'dropoff') {
      setDropoff(coord);
      setSelectionMode(null);
    } else {
      // If no mode selected, cycle pickup then dropoff
      if (!pickup) {
        setPickup(coord);
      } else if (!dropoff) {
        setDropoff(coord);
      } else {
        setPickup(coord);
      }
    }
  };

  const handleSelectPreset = (preset: typeof PRESET_LOCATIONS[0], target: 'pickup' | 'dropoff') => {
    // Reset old results immediately when preset changes
    if (activeTab === 'prediction') {
      setPredictionResult(null);
    } else if (activeTab === 'routing') {
      setRoutingResult(null);
    }

    if (target === 'pickup') {
      setPickup({ lat: preset.lat, lon: preset.lon });
    } else {
      setDropoff({ lat: preset.lat, lon: preset.lon });
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans">
      {/* Header Bar */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSelectionMode(null);
        }}
        backendOnline={backendOnline}
      />

      {/* Main Content Area: Responsive Split */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Column (Desktop) / Bottom Drawer (Mobile) */}
        <section
          aria-label="Bảng điều khiển và kết quả"
          className={`
            transition-all duration-300 ease-in-out z-20 bg-slate-50 border-r border-slate-200 flex flex-col
            /* Desktop Layout (Split 1400x900) */
            md:relative md:w-[460px] lg:w-[500px] xl:w-[540px] md:h-full md:shadow-none
            /* Mobile Layout (Bottom Drawer 390x844) */
            absolute inset-x-0 bottom-0 shadow-2xl rounded-t-2xl md:rounded-none
            ${isMobileDrawerExpanded ? 'h-[85vh]' : 'h-[48vh] md:h-full'}
          `}
        >
          {/* Mobile Drawer Pull Handle Bar */}
          <div className="md:hidden flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-slate-700">
                {activeTab === 'prediction' && 'Dự báo chuyến'}
                {activeTab === 'routing' && 'Tìm đường (A*)'}
                {activeTab === 'dispatch' && 'Đón nhiều khách'}
              </span>
            </div>
            <button
              onClick={() => setIsMobileDrawerExpanded(!isMobileDrawerExpanded)}
              className="p-1 text-slate-500 hover:text-slate-800 flex items-center gap-1 text-xs font-medium"
            >
              <span>{isMobileDrawerExpanded ? 'Thu gọn' : 'Xem thêm'}</span>
              {isMobileDrawerExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Scrollable Form & Results Container */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
            {activeTab === 'prediction' && (
              <PredictionTab
                pickup={pickup}
                dropoff={dropoff}
                selectionMode={selectionMode}
                onSetSelectionMode={setSelectionMode}
                onSetPickup={(coord) => {
                  setPickup(coord);
                  setPredictionResult(null);
                }}
                onSetDropoff={(coord) => {
                  setDropoff(coord);
                  setPredictionResult(null);
                }}
                result={predictionResult}
                onSetResult={setPredictionResult}
              />
            )}

            {activeTab === 'routing' && (
              <RoutingTab
                pickup={pickup}
                dropoff={dropoff}
                selectionMode={selectionMode}
                onSetSelectionMode={setSelectionMode}
                onSetPickup={(coord) => {
                  setPickup(coord);
                  setRoutingResult(null);
                }}
                onSetDropoff={(coord) => {
                  setDropoff(coord);
                  setRoutingResult(null);
                }}
                result={routingResult}
                onSetResult={setRoutingResult}
              />
            )}

            {activeTab === 'dispatch' && (
              <DispatchTab
                vehicleStart={vehicleStart}
                onSetVehicleStart={(coord) => {
                  setVehicleStart(coord);
                  setDispatchResult(null);
                }}
                requests={dispatchRequests}
                onSetRequests={(reqs) => {
                  setDispatchRequests(reqs);
                  setDispatchResult(null);
                }}
                result={dispatchResult}
                onSetResult={setDispatchResult}
              />
            )}
          </div>
        </section>

        {/* Right Column: Full Interactive Leaflet Map */}
        <section aria-label="Bản đồ tương tác Manhattan" className="flex-1 h-full w-full relative z-10">
          <MapComponent
            activeTab={activeTab}
            pickup={pickup}
            dropoff={dropoff}
            vehicleStart={vehicleStart}
            selectionMode={selectionMode}
            onMapClick={handleMapClick}
            onSelectPreset={handleSelectPreset}
            routingGeoJSON={routingResult?.geojson}
            dispatchStops={dispatchResult?.stops}
            dispatchLegs={dispatchResult?.route_legs}
          />
        </section>
      </main>
    </div>
  );
};

export default App;
