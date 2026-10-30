/**
 * Dữ liệu hiển thị dùng chung cho chức năng GỬI TIN / KHIẾU NẠI (form, màn hình biên nhận, sau này là trang theo dõi).
 * Giá trị (value) khớp với enum ở backend: Submission.ReportCategory, Submission.ReporterRelationship, Evidence.FileType.
 */

/** Các loại phản ánh. `slug` dùng trên đường dẫn, ví dụ /submit?type=hot-news. */
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

/**
 * Các GIAI ĐOẠN xử lý một hồ sơ, hiển thị dạng thanh tiến trình (components/submission/ProcessSteps.jsx).
 * Tiếp nhận -> Sàng lọc -> Biên tập viên -> Xác minh thực địa -> Lãnh đạo duyệt (+ Đăng tải).
 */
export const PROCESS_STAGES = [
  { title: 'Tiếp nhận', description: 'Hồ sơ đã vào hệ thống.' },
  { title: 'Sàng lọc', description: 'Kiểm tra trùng lặp, tin rác.' },
  { title: 'Biên tập viên thẩm định', description: 'Đánh giá giá trị báo chí, có thể đề nghị bổ sung.' },
  { title: 'Xác minh thực địa', description: 'Cộng tác viên kiểm chứng tại hiện trường (nếu cần).' },
  { title: 'Lãnh đạo duyệt', description: 'Phó TBT / Tổng biên tập phê duyệt.' },
  { title: 'Đăng tải', description: 'Bài viết được xuất bản.' },
]

/**
 * Trạng thái hồ sơ (khớp enum Submission.SubmissionStatus ở backend), nói theo cách NGƯỜI GỬI dễ hiểu:
 *   - label / tone : chữ + màu nhãn (Badge)
 *   - stage        : đang ở giai đoạn nào trong PROCESS_STAGES (các giai đoạn trước đó coi như đã xong)
 *   - ended        : hồ sơ đã DỪNG xử lý (bị từ chối, huỷ, gỡ) -> giai đoạn hiện tại tô đỏ
 *   - hint         : 1 câu giải thích hiện dưới nhãn trạng thái
 */
export const SUBMISSION_STATUS = {
  PENDING: { label: 'Đã tiếp nhận', tone: 'blue', stage: 1, hint: 'Hồ sơ đang chờ toà soạn sàng lọc.' },
  IN_REVIEW: { label: 'Đang thẩm định', tone: 'blue', stage: 2, hint: 'Biên tập viên đang xem xét hồ sơ của bạn.' },
  NEED_MORE_INFO: { label: 'Cần bổ sung', tone: 'orange', stage: 2, hint: 'Toà soạn cần thêm thông tin để tiếp tục xử lý.' },
  REJECTED: { label: 'Không tiếp nhận', tone: 'red', stage: 2, ended: true, hint: 'Hồ sơ không đủ điều kiện để toà soạn xử lý tiếp.' },
  DEPUTY_PENDING: { label: 'Chờ Phó TBT duyệt', tone: 'purple', stage: 4, hint: 'Bài viết đang chờ Phó Tổng biên tập phê duyệt.' },
  DEPUTY_REJECTED: { label: 'Đang biên tập lại', tone: 'orange', stage: 2, hint: 'Bài viết được trả lại để chỉnh sửa.' },
  EIC_PENDING: { label: 'Chờ TBT duyệt', tone: 'purple', stage: 4, hint: 'Bài viết đang chờ Tổng biên tập phê duyệt.' },
  EIC_REJECTED: { label: 'Không được duyệt', tone: 'red', stage: 4, ended: true, hint: 'Ban biên tập quyết định không đăng tải.' },
  READY_FOR_PUBLISHING: { label: 'Chờ đăng tải', tone: 'green', stage: 5, hint: 'Bài viết đã được duyệt, sắp xuất bản.' },
  PUBLISHED: { label: 'Đã đăng tải', tone: 'green', stage: 6, hint: 'Bài viết đã được xuất bản.' },
  CORRECTED: { label: 'Đã đính chính', tone: 'green', stage: 6, hint: 'Bài viết đã được đính chính sau khi đăng.' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral', stage: 1, ended: true, hint: 'Hồ sơ đã bị huỷ.' },
  RETRACTED: { label: 'Đã gỡ bài', tone: 'red', stage: 5, ended: true, hint: 'Bài viết đã bị gỡ sau khi đăng.' },
}

/** Ai thực hiện một bước trong nhật ký (khớp SubmissionEvent.Actor ở backend). Chỉ hiện vai trò, không hiện tên. */
export const ACTOR_LABELS = {
  REPORTER: 'Người gửi',
  SYSTEM: 'Hệ thống',
  EDITOR: 'Biên tập viên',
  CONTRIBUTOR: 'Cộng tác viên',
  DEPUTY_EIC: 'Phó Tổng biên tập',
  EIC: 'Tổng biên tập',
}

/**
 * Tách lời nhắn "đề nghị bổ sung" của toà soạn thành phần mở đầu + các MỤC đánh số.
 * Biên tập viên thường viết dạng "1. ...", "2) ..." mỗi mục một dòng; dòng không đánh số nối vào mục trước
 * (hoặc vào phần mở đầu nếu chưa có mục nào). Không có dòng đánh số -> items rỗng, cả lời nhắn nằm trong intro.
 * Dùng ở: RequestNoteCard (hiện danh sách mục) và SupplementForm (Chuyên gia trả lời từng mục).
 *
 * Ví dụ: "Vui lòng bổ sung:\n1. Địa chỉ\n2. Ảnh hiện trường" -> { intro: 'Vui lòng bổ sung:', items: ['Địa chỉ', 'Ảnh hiện trường'] }
 */
export const splitRequestNote = (note = '') => {
  const intro = []
  const items = []
  for (const line of note.split(/\r?\n/)) {
    const text = line.trim()
    if (!text) continue
    const match = text.match(/^(\d+)[.)]\s+(.*)$/)
    if (match) items.push(match[2])
    else if (items.length) items[items.length - 1] += `\n${text}`
    else intro.push(text)
  }
  return { intro: intro.join('\n'), items }
}

/** Giới hạn của form "Bổ sung thông tin" (SRS 4.1.2: ô thông tin bổ sung tối đa 2000 ký tự). */
export const SUPPLEMENT_LIMITS = { infoMax: 2000, addressMax: 250, maxSources: 10, sourceTitleMax: 250, sourceUrlMax: 500 }

/** Mã hồ sơ dạng KB-2026-0001 (khớp cách backend sinh mã trong SubmissionService.create). */
export const TRACKING_CODE_REGEX = /^KB-\d{4}-\d{4,}$/i
