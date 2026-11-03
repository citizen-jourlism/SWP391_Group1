
import api from '../lib/api'

// TungTT - Iteration 3 Task 3
// Danh sách lĩnh vực lấy trực tiếp từ Database.
export const expertFieldService = {
  list: () => api.get('/expert-upgrade/fields'),
}
