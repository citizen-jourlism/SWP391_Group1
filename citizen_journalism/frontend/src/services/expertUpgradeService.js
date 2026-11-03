
import api from '../lib/api'

// TungTT - Iteration 3 - Task 3
// API đăng ký và xét duyệt nâng cấp Citizen -> Expert.

export const expertUpgradeService = {
  apply: ({ expertise, qualification, experience, files }) => {
    const data = new FormData()

    data.append('expertise', expertise)
    data.append('qualification', qualification)
    data.append('experience', experience || '')

    files.forEach((file) => {
      data.append('files', file)
    })

    return api.post('/expert-upgrade', data, {
      timeout: 60000,
    })
  },

  mine: () => api.get('/expert-upgrade/me'),

  editorQueue: () => api.get('/expert-upgrade/editor'),

  deputyQueue: () => api.get('/expert-upgrade/deputy'),

  editorReview: (id, approved, note) =>
    api.post(
      `/expert-upgrade/editor/${encodeURIComponent(id)}/review`,
      { approved, note }
    ),

  deputyReview: (id, approved, note) =>
    api.post(
      `/expert-upgrade/deputy/${encodeURIComponent(id)}/review`,
      { approved, note }
    ),

 
  // TungTT - Tải tài liệu Expert qua API có token.
  downloadDocument: async (id, index, filename) => {
    const blob = await api.get(
      `/expert-upgrade/${encodeURIComponent(id)}/documents/${index}`,
      { responseType: 'blob' }
    )

    // Giữ tên tệp để người duyệt nhận biết tài liệu.
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || `expert-document-${index + 1}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  },

}
