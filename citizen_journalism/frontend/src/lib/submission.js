/**
 * Dữ liệu hiển thị dùng chung cho chức năng GỬI TIN / KHIẾU NẠI (form, màn hình biên nhận, sau này là trang theo dõi).
 * Giá trị (value) khớp với enum ở backend: Submission.ReportCategory, Submission.ReporterRelationship, Evidence.FileType.
 */

/** 4 loại phản ánh theo SRS 4.1.1. `slug` dùng trên đường dẫn, ví dụ /submit?type=hot-news. */
export const REPORT_CATEGORIES = [
  {
    value: 'COMPLAINT',
    slug: 'complaint',
    label: 'Khiếu nại / Tố cáo',
    icon: 'flag',
    description: 'Quyền lợi bị xâm phạm, sai phạm của tổ chức, cá nhân cần được làm rõ.',
  },
  {
    value: 'HOT_NEWS',
    slug: 'hot-news',
    label: 'Tin nóng 24/7',
    icon: 'zap',
    description: 'Sự cố, tai nạn, thiên tai... đang diễn ra cần đưa tin ngay.',
  },
  {
    value: 'INVESTIGATION',
    slug: 'investigation',
    label: 'Phóng sự điều tra',
    icon: 'search',
    description: 'Gợi ý vụ việc kéo dài, phức tạp cần toà soạn vào cuộc điều tra.',
  },
  {
    value: 'EXPERT_OPINION',
    slug: 'expert-opinion',
    label: 'Ý kiến chuyên gia',
    icon: 'award',
    description: 'Góc nhìn, phân tích chuyên môn về một vấn đề dân sinh.',
  },
]

/** Tra nhanh thông tin một loại theo value, ví dụ CATEGORY_BY_VALUE.HOT_NEWS.label */
export const CATEGORY_BY_VALUE = Object.fromEntries(REPORT_CATEGORIES.map((item) => [item.value, item]))

/** Đổi slug trên đường dẫn thành value (không khớp thì mặc định Khiếu nại). */
export const categoryFromSlug = (slug) =>
  REPORT_CATEGORIES.find((item) => item.slug === slug)?.value ?? 'COMPLAINT'

/** Mối quan hệ của người gửi với sự việc (ô chọn không bắt buộc). */
export const RELATIONSHIPS = [
  { value: 'DIRECT_VICTIM', label: 'Nạn nhân trực tiếp' },
  { value: 'EYEWITNESS', label: 'Nhân chứng' },
  { value: 'LEGAL_REPRESENTATIVE', label: 'Người đại diện hợp pháp' },
  { value: 'INDEPENDENT_EXPERT', label: 'Chuyên gia độc lập' },
]

/** Icon + tên của từng loại tệp (khớp Evidence.FileType ở backend). */
export const FILE_TYPE_INFO = {
  IMAGE: { icon: 'image', label: 'Hình ảnh' },
  VIDEO: { icon: 'film', label: 'Video' },
  AUDIO: { icon: 'music', label: 'Ghi âm' },
  DOCUMENT: { icon: 'fileText', label: 'Tài liệu' },
}

/** Loại tệp suy ra từ Content-Type, cùng cách với backend (SubmissionService.fileTypeOf). */
export const fileTypeOf = (mimeType = '') => {
  if (mimeType.startsWith('image/')) return 'IMAGE'
  if (mimeType.startsWith('video/')) return 'VIDEO'
  if (mimeType.startsWith('audio/')) return 'AUDIO'
  return 'DOCUMENT'
}

/** Số MB -> số byte. */
export const MB = 1024 * 1024
