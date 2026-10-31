
import api from '../lib/api'

export const notificationService = {
  getMine: () => api.get('/notification-history/mine'),
}
