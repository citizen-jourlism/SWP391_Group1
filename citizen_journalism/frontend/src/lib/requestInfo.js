/**
 * Dữ liệu dùng chung cho chức năng YÊU CẦU BỔ SUNG THÔNG TIN (Request Additional Information, Biên tập viên):
 * màn routes/editor/EditorRequestInfo.jsx.
 *
 * DB không có bảng riêng cho yêu cầu bổ sung. Khi Biên tập viên xác nhận, backend ghi:
 *   - submissions.status = NEED_MORE_INFO
 *   - submission_events: status NEED_MORE_INFO, actor EDITOR, description "Toà soạn đề nghị bổ sung thông tin",
 *     note = lời nhắn gửi người gửi + các mục đánh số (buildRequestNote bên dưới)
 *   - editorial_reviews: review_role EDITOR, action REQUEST_INFO, comments = ghi chú nội bộ (người gửi không thấy)
 * Người gửi đọc lời nhắn ở hộp "Toà soạn đề nghị bổ sung" (RequestNoteCard) rồi trả lời ở trang Bổ sung thông tin;
 * hai màn đó tách mục bằng lib/submission.js -> splitRequestNote, nên note phải giữ dạng "1. ...", "2. ...".
 */

/** Chỉ yêu cầu bổ sung được với hồ sơ đang ở bước tiếp nhận / thẩm định. */
export const REQUESTABLE_STATUSES = ['PENDING', 'IN_REVIEW']

/** Giới hạn form: số mục, độ dài mỗi mục, lời nhắn chung và ghi chú nội bộ (đều không bắt buộc). */
export const REQUEST_INFO_LIMITS = { maxItems: 5, itemMin: 10, itemMax: 300, messageMax: 1000, noteMax: 500 }

/** Lời nhắn mở đầu điền sẵn, Biên tập viên sửa được. */
export const DEFAULT_REQUEST_MESSAGE =
  'Chào bạn, cảm ơn bạn đã gửi thông tin cho toà soạn. Để toà soạn tiếp tục xác minh, bạn vui lòng bổ sung giúp:'

/** Các mục hay hỏi: bấm chip để thêm nhanh một mục với câu mẫu. */
export const QUICK_ITEMS = [
  {
    key: 'ADDRESS',
    icon: 'mapPin',
    label: 'Địa chỉ chính xác',
    text: 'Địa chỉ chính xác nơi xảy ra sự việc (số nhà, tên đường hoặc mốc gần nhất).',
  },
  {
    key: 'MEDIA',
    icon: 'image',
    label: 'Ảnh / video hiện trường',
    text: 'Ảnh hoặc video chụp rõ hiện trường, nếu được hãy bật định vị khi chụp.',
  },
  {
    key: 'TIME',
    icon: 'calendar',
    label: 'Thời điểm xảy ra',
    text: 'Sự việc bắt đầu từ khi nào và hiện tại còn tiếp diễn không.',
  },
  {
    key: 'DOCS',
    icon: 'fileText',
    label: 'Giấy tờ liên quan',
    text: 'Giấy tờ liên quan (đơn đã gửi chính quyền, biên nhận, văn bản trả lời) nếu có.',
  },
  {
    key: 'WITNESS',
    icon: 'user',
    label: 'Người làm chứng',
    text: 'Tên và số điện thoại một người làm chứng mà toà soạn có thể liên hệ.',
  },
  {
    key: 'SOURCE',
    icon: 'link',
    label: 'Nguồn tham khảo',
    text: 'Nguồn tham khảo hoặc số liệu gốc cho các thông tin bạn nêu (đường dẫn, tên tài liệu).',
  },
]

/**
 * Ghép lời nhắn + các mục thành note gửi người gửi: "Lời nhắn\n1. Mục 1\n2. Mục 2".
 * Mỗi mục gộp về một dòng để splitRequestNote tách lại đúng số mục.
 */
export const buildRequestNote = (message, items) =>
  [message.trim(), ...items.map((text, index) => `${index + 1}. ${text.replace(/\s+/g, ' ').trim()}`)]
    .filter(Boolean)
    .join('\n')

/**
 * Kiểm tra form, trả về { items, itemErrors, message, note } (chuỗi lỗi, '' nếu hợp lệ).
 * itemErrors: lỗi của từng mục, cùng thứ tự với mảng items.
 */
export const validateInfoRequest = ({ items, message, note }) => {
  const { maxItems, itemMin, itemMax, messageMax, noteMax } = REQUEST_INFO_LIMITS
  const itemErrors = items.map((text) => {
    const length = text.trim().length
    if (length < itemMin) return `Mỗi mục cần tối thiểu ${itemMin} ký tự.`
    if (length > itemMax) return `Mỗi mục tối đa ${itemMax} ký tự.`
    return ''
  })
  return {
    items:
      items.length === 0
        ? 'Vui lòng thêm ít nhất 1 mục cần bổ sung.'
        : items.length > maxItems
          ? `Tối đa ${maxItems} mục.`
          : '',
    itemErrors,
    message: message.trim().length > messageMax ? `Lời nhắn tối đa ${messageMax} ký tự.` : '',
    note: note.trim().length > noteMax ? `Ghi chú tối đa ${noteMax} ký tự.` : '',
  }
}
