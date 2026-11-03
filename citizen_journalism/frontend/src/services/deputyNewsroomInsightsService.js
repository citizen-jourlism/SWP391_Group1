
import api from '../lib/api'

// TungTT - Iteration 3 - Tasks 4 & 5
// Đọc Dashboard và danh bạ nhân sự biên tập.
export const deputyNewsroomInsightsService = {
  dashboard: (period = 'WEEK') =>
    api.get('/leadership/insights/dashboard', {
      params: { period },
    }),

  staff: (keyword = '') =>
    api.get('/leadership/insights/staff', {
      params: { keyword: keyword.trim() || undefined },
    }),
}
