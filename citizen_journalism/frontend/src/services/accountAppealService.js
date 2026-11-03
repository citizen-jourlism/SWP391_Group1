import api from '../lib/api'

export const accountAppealService = {
  create: (payload) => api.post('/appeals', payload),
  status: (payload) => api.post('/appeals/status', payload),
}
