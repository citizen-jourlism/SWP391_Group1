import api from '../lib/api'
import { cleanParams } from '../lib/payload'

export const violationService = {
  listForEditor: (params) => api.get('/editor/violations', { params: cleanParams(params) }),
  getForEditor: (id) => api.get(`/editor/violations/${id}`),
  create: (payload) => api.post('/editor/violations', payload),
  review: (id, payload) => api.post(`/editor/violations/${id}/review`, payload),
  listApprovals: (params) => api.get('/leadership/violation-approvals', { params: cleanParams(params) }),
  getApproval: (id) => api.get(`/leadership/violation-approvals/${id}`),
  decide: (id, payload) => api.post(`/leadership/violation-approvals/${id}/decision`, payload),
  listEditorAppeals: (params) => api.get('/editor/appeals', { params: cleanParams(params) }),
  getEditorAppeal: (id) => api.get(`/editor/appeals/${id}`),
  reviewAppeal: (id, payload) => api.post(`/editor/appeals/${id}/review`, payload),
  listLeadershipAppeals: (params) => api.get('/leadership/appeals', { params: cleanParams(params) }),
  getLeadershipAppeal: (id) => api.get(`/leadership/appeals/${id}`),
  decideAppeal: (id, payload) => api.post(`/leadership/appeals/${id}/decision`, payload),
}
