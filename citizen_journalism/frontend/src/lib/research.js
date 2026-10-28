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

/** Trạng thái bài: nhãn + màu Badge. Khớp enum ResearchArticle.Status ở backend. */
export const RESEARCH_STATUS = {
  DRAFT: { label: 'Bản nháp', tone: 'neutral' },
  SUBMITTED: { label: 'Chờ duyệt', tone: 'orange' },
  APPROVED: { label: 'Đã duyệt', tone: 'green' },
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
  { key: 'references', label: 'Có tài liệu tham khảo', done: Boolean(doc.references.trim()) },
  {
    key: 'conflict',
    label: 'Đã khai báo xung đột lợi ích',
    done: doc.hasConflict === 'NO' || (doc.hasConflict === 'YES' && doc.conflictNote.trim().length >= 10),
  },
]
