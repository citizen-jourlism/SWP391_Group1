import api from '../lib/api'

/**
 * API DANH MỤC ĐỊA CHỈ dùng chung (backend: LocationController.java), cần đăng nhập.
 */
export const locationService = {
  provinces: () => api.get('/locations/provinces'),
  wards: (province) => api.get('/locations/wards', { params: { province } }),
}
