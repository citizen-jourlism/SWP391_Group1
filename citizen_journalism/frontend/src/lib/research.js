/**
 * Hàm / dữ liệu dùng chung cho BÀI NGHIÊN CỨU của Chuyên gia (trình soạn thảo + trang quản lý bản nháp).
 */

/**
 * Đếm số chữ: tách theo khoảng trắng. Backend đếm CÙNG CÁCH (ResearchArticleService.countWords)
 * nên con số hiển thị khớp với điều kiện "tối thiểu N chữ" khi nộp bài.
 */
export const countWords = (text) => {
  const trimmed = (text ?? '').trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

/**
 * Định dạng 1 đường link tài liệu tham khảo: http(s):// + tên miền có dấu chấm + cổng / đường dẫn tuỳ ý,
 * không chứa khoảng trắng. Backend kiểm tra CÙNG mẫu này (ResearchArticleService.REFERENCE_LINK).
 */
const REFERENCE_LINK = /^https?:\/\/([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?([/?#]\S*)?$/i

/**
 * Tìm các dòng tài liệu tham khảo KHÔNG phải link hợp lệ (bỏ qua dòng trống).
 * Trả về mảng số thứ tự dòng (tính từ 1), mảng rỗng nghĩa là mọi dòng đều đúng.
 */
export const invalidReferenceLines = (text) =>
  (text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line, index) => (REFERENCE_LINK.test(line) ? [] : [index + 1]))

/** Trạng thái bài: nhãn + màu Badge. Khớp enum ResearchArticle.Status ở backend. */
export const RESEARCH_STATUS = {
  DRAFT: { label: 'Bản nháp', tone: 'neutral' },
  SUBMITTED: { label: 'Chờ duyệt', tone: 'orange' },
  APPROVED: { label: 'Đã duyệt', tone: 'green' },
  REJECTED: { label: 'Đã từ chối', tone: 'red' },
}

/**
 * Các mục của BẢNG KIỂM TRA trước khi nộp (cột phải trình soạn thảo). Mỗi mục: tên + hàm kiểm tra.
 * Ngưỡng lấy từ backend (options) để 2 bên không lệch nhau.
 *
 * @param doc     các ô của bài đang soạn
 * @param images  danh sách ảnh hiện có
 * @param options GET /api/research/options
 */
export const submitChecklist = (doc, images, options) => [
  { key: 'title', label: `Tiêu đề từ ${options.minTitleLength} ký tự`, done: doc.title.trim().length >= options.minTitleLength },
  { key: 'abstractText', label: `Tóm tắt từ ${options.minAbstractLength} ký tự`, done: doc.abstractText.trim().length >= options.minAbstractLength },
  { key: 'field', label: 'Đã chọn lĩnh vực và từ khoá', done: Boolean(doc.field && doc.keywords.trim()) },
  { key: 'content', label: `Nội dung từ ${options.minWords} chữ`, done: countWords(doc.content) >= options.minWords },
  { key: 'images', label: 'Có ít nhất 1 hình ảnh minh hoạ', done: images.length > 0 },
  {
    key: 'references',
    label: 'Tài liệu tham khảo là link hợp lệ',
    // Phải có ít nhất 1 dòng VÀ mọi dòng đều là link
    done: Boolean(doc.references.trim()) && invalidReferenceLines(doc.references).length === 0,
  },
  {
    key: 'conflict',
    label: 'Đã khai báo xung đột lợi ích',
    done: doc.hasConflict === 'NO' || (doc.hasConflict === 'YES' && doc.conflictNote.trim().length >= 10),
  },
]
