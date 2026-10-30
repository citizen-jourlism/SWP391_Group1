
import api from '../lib/api'

export const categoryManageService = {
  list: () => api.get('/editor/categories'),

  create: (data) =>
    api.post('/editor/categories', data),

  update: (id, data) =>
    api.put(`/editor/categories/${id}`, data),

  setActive: (id, active) =>
    api.patch(`/editor/categories/${id}/active`, { active }),
}
