import api from '../lib/api'

/**
 * Các lời gọi API GỬI TIN / KHIẾU NẠI và THEO DÕI HỒ SƠ
 * (backend: SubmissionController.java - cần đăng nhập; TrackingController.java - công khai).
 */
export const submissionService = {
  /** Tra cứu bằng mã hồ sơ + PIN, không cần đăng nhập. POST để PIN không nằm trên đường dẫn. */
  track: (trackingCode, pin) => api.post('/tracking', { trackingCode, pin }),

  /** Danh sách "Hồ sơ đã gửi" của tôi: { items, page, size, totalItems, totalPages } */
  listMine: (page, size = 10) => api.get('/submissions/mine', { params: { page, size } }),

  /** Chi tiết 1 hồ sơ của tôi theo mã. encodeURIComponent: phòng mã có ký tự đặc biệt làm hỏng đường dẫn. */
  getMine: (trackingCode) => api.get(`/submissions/mine/${encodeURIComponent(trackingCode)}`),

  /** Danh sách tỉnh/thành + giới hạn tệp: { provinces, maxFiles, maxFileSizeMb, maxTotalSizeMb, acceptedTypes } */
  getOptions: () => api.get('/submissions/options'),

  /**
   * Gửi form dạng multipart/form-data gồm 2 phần (khớp @RequestPart ở backend):
   *   - "data" : các ô chữ, đóng gói thành JSON. Bọc trong Blob type 'application/json' để backend
   *              biết phần này là JSON và tự đổi thành CreateSubmissionRequest.
   *   - "files": mỗi tệp một lần append cùng tên "files" -> backend nhận được List<MultipartFile>.
   *
   * @param data        object các ô chữ (đã qua toPayload)
   * @param files       mảng File người dùng chọn
   * @param onProgress  hàm nhận % đã tải lên (0–100), để hiện thanh tiến trình
   */
  create: (data, files, onProgress) => {
    const formData = new FormData()
    formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }))
    files.forEach((file) => formData.append('files', file))
    return api.post('/submissions', formData, {
      // Tệp có thể lớn (tối đa 50MB/tệp): bỏ giới hạn 15 giây mặc định trong lib/api.js
      timeout: 0,
      onUploadProgress: (event) => event.total && onProgress?.(Math.round((event.loaded / event.total) * 100)),
    })
  },
}
