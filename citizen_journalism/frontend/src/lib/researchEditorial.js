import { REPORT_CATEGORIES } from './submission'

/*
 * HẰNG SỐ + HÀM TIỆN ÍCH của luồng biên tập bài nghiên cứu (cả trang Biên tập viên lẫn Chuyên gia).
 * Value của các hằng số khớp enum trong backend service/ResearchEditorialService.java.
 *
 *   1. Loại trong hàng đợi tin bài          4. Tiêu chí đánh giá khi Duyệt (không có điểm)
 *   2. Trạng thái yêu cầu chỉnh sửa         5. So sánh 2 đoạn văn theo từng chữ (diffWords)
 *   3. Kết quả duyệt + cấp độ
 */

// ============================== 1. LOẠI TRONG HÀNG ĐỢI ==============================
// 3 loại phản ánh (lấy lại từ lib/submission.js) + bài nghiên cứu. slug: hậu tố class màu icon trong submit.css.

const TONE_BY_SLUG = { complaint: 'red', 'hot-news': 'orange', investigation: 'blue' }

export const QUEUE_TYPES = [
  ...REPORT_CATEGORIES.map(({ value, slug, label, icon }) => ({ value, slug, label, icon, tone: TONE_BY_SLUG[slug] })),
  { value: 'RESEARCH', slug: 'research', label: 'Bài nghiên cứu', icon: 'edit', tone: 'purple' },
]

/** Tra nhanh một loại theo value, ví dụ QUEUE_TYPE_BY_VALUE.RESEARCH.label */
export const QUEUE_TYPE_BY_VALUE = Object.fromEntries(QUEUE_TYPES.map((item) => [item.value, item]))

// ============================== 2. YÊU CẦU CHỈNH SỬA ==============================

/** Trạng thái 1 yêu cầu: nhãn + màu Badge. */
export const REVISION_STATUS = {
  PENDING: { label: 'Chờ Chuyên gia phản hồi', tone: 'orange' },
  ACCEPTED: { label: 'Chuyên gia đã đồng ý', tone: 'green' },
  REJECTED: { label: 'Chuyên gia đã từ chối', tone: 'red' },
}

/** Tình trạng biên tập của 1 bài ở màn "Biên tập bài viết" (theo yêu cầu chỉnh sửa gần nhất). */
export const EDIT_STATUS = {
  NOT_EDITED: { label: 'Chưa chỉnh sửa', tone: 'neutral' },
  PENDING: { label: 'Chờ Chuyên gia phản hồi', tone: 'orange' },
  ACCEPTED: { label: 'Đã chỉnh sửa', tone: 'green' },
  REJECTED: { label: 'Chuyên gia từ chối', tone: 'red' },
}

/** Nhãn người viết bình luận theo vai trò lúc viết. */
export const COMMENT_ROLE = {
  EXPERT: { label: 'Chuyên gia', tone: 'purple' },
  EDITOR: { label: 'Biên tập viên', tone: 'blue' },
}

/** 4 ô của 1 phiên bản bài -> giá trị ban đầu cho form sửa (ô null thành chuỗi rỗng để ô nhập không lỗi). */
export const toFormValues = (fields) => ({
  title: fields?.title ?? '',
  abstractText: fields?.abstractText ?? '',
  keywords: fields?.keywords ?? '',
  content: fields?.content ?? '',
})

// ============================== 3. KẾT QUẢ DUYỆT + CẤP ĐỘ ==============================

/** Cấp độ phân loại: nhãn + màu Badge. */
export const PRIORITY_INFO = {
  LOW: { label: 'Low', tone: 'green', hint: 'Duyệt theo thứ tự thông thường' },
  MEDIUM: { label: 'Medium', tone: 'orange', hint: 'Cần đọc kỹ phần xung đột lợi ích / nhắc đến cá nhân, tổ chức' },
  HIGH: { label: 'High', tone: 'red', hint: 'Ưu tiên xem trước, cân nhắc kiểm tra pháp lý' },
  BREAKING: { label: 'Breaking', tone: 'dark', hint: 'Tin đặc biệt nghiêm trọng: Phó TBT duyệt trước, rồi Tổng biên tập phê duyệt' },
}

/** Kết quả duyệt của Biên tập viên (null = chờ duyệt). */
const REVIEW_STATUS = {
  PENDING_REVIEW: { label: 'Chờ duyệt', tone: 'neutral' },
  DEPUTY_PENDING: { label: 'Đã chuyển Phó TBT', tone: 'purple' },
  EIC_PENDING: { label: 'Đã chuyển Tổng biên tập', tone: 'dark' },
  REJECTED: { label: 'Đã từ chối', tone: 'red' },
  // Sau bước Ban biên tập (bàn duyệt /leadership)
  READY_FOR_PUBLISHING: { label: 'Ban biên tập đã duyệt', tone: 'green' },
  EIC_REJECTED: { label: 'Ban biên tập không duyệt', tone: 'red' },
}

/** Nhãn kết quả duyệt đầy đủ (Bàn duyệt của Ban biên tập); null (chưa duyệt) -> "Chờ duyệt". */
export const reviewStatusInfo = (status) => REVIEW_STATUS[status ?? 'PENDING_REVIEW']

/**
 * Nhãn kết quả duyệt CHO BIÊN TẬP VIÊN: chỉ biết bài chờ duyệt / đã duyệt / đã từ chối / không được đăng,
 * không biết bài đang ở bước nào của Ban biên tập (backend cũng đã gộp EIC_PENDING vào DEPUTY_PENDING).
 */
const EDITOR_REVIEW_STATUS = {
  PENDING_REVIEW: { label: 'Chờ duyệt', tone: 'neutral' },
  DEPUTY_PENDING: { label: 'Đã duyệt', tone: 'green' },
  EIC_PENDING: { label: 'Đã duyệt', tone: 'green' },
  READY_FOR_PUBLISHING: { label: 'Đã duyệt', tone: 'green' },
  REJECTED: { label: 'Đã từ chối', tone: 'red' },
  EIC_REJECTED: { label: 'Không được đăng', tone: 'red' },
}

export const editorReviewInfo = (status) => EDITOR_REVIEW_STATUS[status ?? 'PENDING_REVIEW']

// ============================== 4. TIÊU CHÍ ĐÁNH GIÁ KHI DUYỆT ==============================
// Các lựa chọn BTV tick khi Duyệt bài nghiên cứu (value khớp enum backend ResearchEditorialService).
// CHỈ có nhãn + gợi ý: điểm, cách tính cấp độ và nơi bài được chuyển tới nằm hết ở backend, BTV không được biết.

export const POLITICAL_OPTIONS = [
  { value: 'NONE', label: 'Không liên quan chính trị', hint: 'Bài khoa học, đời sống, kỹ thuật thuần tuý.' },
  { value: 'POLICY', label: 'Phân tích, góp ý chính sách / pháp luật', hint: 'Đánh giá tác động một chính sách, đề xuất sửa quy định.' },
  { value: 'STATE_CRITICISM', label: 'Phê phán cơ quan nhà nước, cán bộ cụ thể', hint: 'Chỉ ra sai phạm, yếu kém của một sở, UBND, cán bộ / công chức có tên.' },
  { value: 'NATIONAL_SENSITIVE', label: 'Nhạy cảm cấp quốc gia', hint: 'Chủ quyền, quốc phòng - an ninh, tôn giáo, dân tộc, đối ngoại, lãnh đạo cấp cao.' },
]

// Thứ tự từ hẹp tới rộng (dùng vị trí trong mảng để so sánh "từ nhiều tỉnh trở lên")
export const SCOPE_OPTIONS = [
  { value: 'LOCAL', label: 'Xã / phường, một nhóm nhỏ', hint: 'Ảnh hưởng tới một khu dân cư, một doanh nghiệp, vài chục người.' },
  { value: 'PROVINCIAL', label: 'Một tỉnh / thành phố', hint: 'Người dân của một tỉnh / thành chịu tác động.' },
  { value: 'REGIONAL', label: 'Nhiều tỉnh hoặc cả một ngành', hint: 'Một vùng, lưu vực sông, toàn bộ ngành giáo dục / y tế...' },
  { value: 'NATIONAL', label: 'Toàn quốc', hint: 'Người dân cả nước chịu tác động.' },
]

export const URGENCY_OPTIONS = [
  { value: 'NONE', label: 'Giá trị lâu dài, không gấp', hint: 'Nghiên cứu, tổng kết; đăng lúc nào vẫn giữ nguyên giá trị.' },
  { value: 'TIMELY', label: 'Gắn với sự kiện đang diễn ra', hint: 'Liên quan tới sự kiện, chính sách vừa ban hành, cần đăng sớm.' },
  { value: 'PUBLIC_SAFETY', label: 'Cảnh báo nguy hại đang xảy ra', hint: 'Đe doạ tính mạng, sức khoẻ, tài sản của người dân (ô nhiễm, dịch bệnh, thực phẩm bẩn...).' },
]

export const CONFLICT_OPTIONS = [
  { value: 'NONE', label: 'Không có', hint: 'Tác giả khai "không có" và bạn không thấy dấu hiệu nào.' },
  { value: 'DECLARED', label: 'Có, đã khai báo', hint: 'Tác giả tự khai có xung đột lợi ích, bài đã có giải trình.' },
  { value: 'UNDECLARED', label: 'Có, KHÔNG khai báo', hint: 'Bạn phát hiện liên quan lợi ích (tài trợ, nơi làm việc, sản phẩm...) mà tác giả không khai.' },
]

export const MENTION_OPTIONS = [
  { value: 'NONE', label: 'Không nêu tên cụ thể', hint: 'Chỉ nói chung: "một số doanh nghiệp", "nhiều địa phương".' },
  { value: 'NEUTRAL', label: 'Có nêu tên, trung lập', hint: 'Trích dẫn nghiên cứu của ông A, lấy số liệu của công ty B.' },
  { value: 'CRITICISM_WITH_EVIDENCE', label: 'Phê phán / cáo buộc có dẫn chứng', hint: 'Nêu sai phạm của cá nhân / tổ chức kèm số liệu, tài liệu tham khảo.' },
  // blocked: chọn mức này thì bài KHÔNG được duyệt (BTV phải yêu cầu chỉnh sửa hoặc từ chối)
  { value: 'ATTACK_WITHOUT_EVIDENCE', blocked: true, label: 'Công kích / cáo buộc thiếu dẫn chứng', hint: 'Quy kết, dùng từ ngữ xúc phạm cá nhân / tổ chức cụ thể mà không có nguồn (nguy cơ vu khống).' },
  { value: 'EXPOSES_VULNERABLE', blocked: true, label: 'Lộ danh tính trẻ em, nạn nhân, người bệnh', hint: 'Có tên, ảnh, địa chỉ... nhận ra được trẻ em, nạn nhân bị xâm hại, người bệnh. Luật Trẻ em, Luật Báo chí cấm.' },
]

/** Nhãn của 1 lựa chọn (để hiện lại kết quả đã duyệt). */
export const optionLabel = (options, value) => options.find((item) => item.value === value)?.label ?? value

// ============================== 5. SO SÁNH 2 ĐOẠN VĂN THEO TỪNG CHỮ ==============================
// Tìm phần thêm vào / xoá đi giữa bản gốc và bản đã sửa (thuật toán "dãy con chung dài nhất" - LCS):
//   1. Tách văn bản thành các "mẩu": từng chữ và từng cụm khoảng trắng (giữ lại để ghép ra đúng văn bản).
//   2. Bỏ phần giống nhau ở ĐẦU và CUỐI trước — thường chỉ sửa vài chỗ nên phần giữa còn lại rất ngắn.
//   3. Với phần giữa: mẩu chỉ có ở bản gốc = bị xoá, chỉ có ở bản mới = thêm vào.
// Tự viết (~50 dòng) để khỏi thêm thư viện vào package.json của cả nhóm.

/** Phần giữa quá dài (sửa gần như toàn bộ bài) thì coi như xoá hết rồi viết lại — tránh treo trình duyệt. */
const MAX_CELLS = 4_000_000

/** "Xin chào  bạn" -> ["Xin", " ", "chào", "  ", "bạn"] */
const tokenize = (text) => (text ?? '').split(/(\s+)/).filter((token) => token !== '')

/** @returns mảng các đoạn liên tiếp { type: 'same' | 'add' | 'del', text } */
export function diffWords(oldText, newText) {
  const a = tokenize(oldText)
  const b = tokenize(newText)
  const parts = []
  // Thêm 1 đoạn; cùng loại với đoạn trước thì nối vào để kết quả gọn (ít thẻ <ins>/<del> hơn).
  const push = (type, text) => {
    if (!text) return
    const last = parts[parts.length - 1]
    if (last && last.type === type) last.text += text
    else parts.push({ type, text })
  }

  // Bước 2: phần giống nhau ở đầu và cuối
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let endA = a.length
  let endB = b.length
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--
    endB--
  }

  push('same', a.slice(0, start).join(''))
  const midA = a.slice(start, endA)
  const midB = b.slice(start, endB)

  if (midA.length * midB.length > MAX_CELLS) {
    push('del', midA.join(''))
    push('add', midB.join(''))
  } else {
    // Bước 3: lcs[i][j] = độ dài dãy chung dài nhất của midA từ vị trí i và midB từ vị trí j (lưu phẳng trong 1 mảng).
    const cols = midB.length + 1
    const lcs = new Uint32Array((midA.length + 1) * cols)
    for (let i = midA.length - 1; i >= 0; i--) {
      for (let j = midB.length - 1; j >= 0; j--) {
        lcs[i * cols + j] =
          midA[i] === midB[j] ? lcs[(i + 1) * cols + j + 1] + 1 : Math.max(lcs[(i + 1) * cols + j], lcs[i * cols + j + 1])
      }
    }
    // Đi từ đầu: mẩu giống nhau -> 'same'; không thì đi theo hướng giữ được dãy chung dài hơn.
    let i = 0
    let j = 0
    while (i < midA.length && j < midB.length) {
      if (midA[i] === midB[j]) {
        push('same', midA[i])
        i++
        j++
      } else if (lcs[(i + 1) * cols + j] >= lcs[i * cols + j + 1]) {
        push('del', midA[i++])
      } else {
        push('add', midB[j++])
      }
    }
    push('del', midA.slice(i).join(''))
    push('add', midB.slice(j).join(''))
  }

  push('same', a.slice(endA).join(''))

  // Dọn kết quả: dấu cách "giống nhau" kẹp giữa 2 đoạn cùng được thêm (hoặc cùng bị xoá) thì gộp luôn vào,
  // để "[Đoạn] [mở đầu]" hiện thành 1 khối "[Đoạn mở đầu]" thay vì bị cắt vụn.
  const merged = []
  parts.forEach((part, index) => {
    const prev = merged[merged.length - 1]
    const next = parts[index + 1]
    const loneSpace = part.type === 'same' && !part.text.trim() && prev && next && prev.type !== 'same' && prev.type === next.type
    const type = loneSpace ? prev.type : part.type
    if (prev && prev.type === type) prev.text += part.text
    else merged.push({ type, text: part.text })
  })
  return merged
}
