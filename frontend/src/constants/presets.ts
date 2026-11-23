import { PresetLocation } from '../types';

export const MANHATTAN_BOUNDS = {
  minLon: -74.05,
  minLat: 40.69,
  maxLon: -73.90,
  maxLat: 40.88,
};

export const MANHATTAN_CENTER = {
  lat: 40.7580,
  lon: -73.9855,
};

export const PRESET_LOCATIONS: PresetLocation[] = [
  {
    id: 'times_square',
    name: 'Times Square',
    vietnameseName: 'Quảng trường Thời Đại',
    lat: 40.7580,
    lon: -73.9855,
    description: 'Khu vực trung tâm sôi động nhất Manhattan, giao lộ đại lộ Broadway và Seventh Avenue.'
  },
  {
    id: 'central_park',
    name: 'Central Park',
    vietnameseName: 'Công viên Trung tâm (Cổng Nam)',
    lat: 40.7660,
    lon: -73.9772,
    description: 'Lá phổi xanh nổi tiếng của New York, tiếp giáp đường 59th Street.'
  },
  {
    id: 'grand_central',
    name: 'Grand Central',
    vietnameseName: 'Nhà ga Trung tâm Grand Central',
    lat: 40.7527,
    lon: -73.9772,
    description: 'Đầu mối đường sắt và tàu điện ngầm lớn nhất thành phố tại đường 42nd St.'
  },
  {
    id: 'wall_street',
    name: 'Wall Street',
    vietnameseName: 'Phố Wall (Khu Tài Chính)',
    lat: 40.7069,
    lon: -74.0090,
    description: 'Trung tâm tài chính thế giới, gần Sở giao dịch chứng khoán New York (NYSE).'
  },
  {
    id: 'empire_state',
    name: 'Empire State',
    vietnameseName: 'Tòa nhà Empire State',
    lat: 40.7484,
    lon: -73.9857,
    description: 'Biểu tượng kiến trúc Art Deco cao tầng tại đường 34th Street và Fifth Avenue.'
  },
  {
    id: 'soho',
    name: 'SoHo',
    vietnameseName: 'Khu phố thời trang SoHo',
    lat: 40.7233,
    lon: -74.0030,
    description: 'Khu phố nghệ thuật, ẩm thực và mua sắm lịch sử ở mạn nam Manhattan.'
  }
];

export function isWithinManhattan(lat: number, lon: number): boolean {
  return (
    lat >= MANHATTAN_BOUNDS.minLat &&
    lat <= MANHATTAN_BOUNDS.maxLat &&
    lon >= MANHATTAN_BOUNDS.minLon &&
    lon <= MANHATTAN_BOUNDS.maxLon
  );
}
