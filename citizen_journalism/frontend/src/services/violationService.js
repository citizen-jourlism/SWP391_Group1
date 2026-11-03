import api from '../lib/api'
import { cleanParams } from '../lib/payload'

export const violationService = {
  listEditorAppeals: (params) => api.get('/editor/appeals', { params: cleanParams(params) }),
  getEditorAppeal: (id) => api.get(`/editor/appeals/${id}`),
  reviewAppeal: (id, payload) => api.post(`/editor/appeals/${id}/review`, payload),
  listLeadershipAppeals: (params) => api.get('/leadership/appeals', { params: cleanParams(params) }),
  getLeadershipAppeal: (id) => api.get(`/leadership/appeals/${id}`),
  decideAppeal: (id, payload) => api.post(`/leadership/appeals/${id}/decision`, payload),
}
