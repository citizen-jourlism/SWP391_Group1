import api from '../lib/api'

/**
 * Các lời gọi API GỬI TIN / KHIẾU NẠI (backend: SubmissionController.java). Cần đăng nhập.
 */
export const submissionService = {
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
