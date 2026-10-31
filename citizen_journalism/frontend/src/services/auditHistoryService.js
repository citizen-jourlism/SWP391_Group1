
import api from '../lib/api'
import { tokenStorage } from '../lib/tokenStorage'

function params(filters = {}) {
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== '' && value != null
    )
  )
}

export const auditHistoryService = {
  search: (filters) =>
    api.get('/admin/audit-history', {
      params: params(filters),
    }),

  exportCsv: async (filters) => {
    const url = new URL(
      '/api/admin/audit-history/export',
      window.location.origin
    )

    for (const [key, value] of Object.entries(params(filters))) {
      url.searchParams.set(key, value)
    }

    const token = tokenStorage.get()

    const response = await fetch(url, {
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : {},
    })

    if (!response.ok) {
      throw new Error(
        `Không thể xuất dữ liệu (HTTP ${response.status}).`
      )
    }

    const blob = await response.blob()
    const downloadUrl = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = 'existing-history.csv'

    document.body.appendChild(link)
    link.click()
    link.remove()

    URL.revokeObjectURL(downloadUrl)
  },
}
