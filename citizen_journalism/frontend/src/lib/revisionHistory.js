/**
 * Hàm xử lý LỊCH SỬ CHỈNH SỬA hồ sơ (trang routes/SubmissionHistory.jsx). Không gọi API, không vẽ giao diện.
 * Dữ liệu vào: revisions = mảng phiên bản backend trả về (SubmissionHistoryResponse.RevisionResponse),
 * phần tử đầu là bản gốc (number 1), mỗi phiên bản sau chỉ chứa phần THÊM MỚI của lần bổ sung đó.
 */

/** Cột "Các phiên bản" chỉ hiện chừng này bản mới nhất, còn lại bấm "Xem thêm". */
export const VISIBLE_VERSIONS = 5

/** Có hơn chừng này mục giữ nguyên (lần bổ sung cũ, tệp cũ) thì gom vào 1 dòng thu gọn. */
export const FOLD_THRESHOLD = 5

/** Số từ của 1 đoạn chữ (tách theo khoảng trắng). */
export const countWords = (text) => (text ? text.trim().split(/\s+/).filter(Boolean).length : 0)

/** Phần chữ của 1 phiên bản: nội dung (bản gốc / ô bổ sung chung) hoặc các câu trả lời từng mục của Chuyên gia. */
export const textOf = (revision) =>
  [revision.content, ...revision.answers.map((answer) => answer.answer)].filter(Boolean).join('\n')

/** Tên hiển thị: "Bản gốc", "Bổ sung lần 1"... */
export const revisionTitle = (number) => (number === 1 ? 'Bản gốc' : `Bổ sung lần ${number - 1}`)

/** "2026-10-27T20:05:00" -> "27/10 20:05" (nhãn ngắn trong ô chọn phiên bản) */
export const formatShort = (value) => {
  const date = new Date(value)
  const pad = (number) => String(number).padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * Số liệu CỘNG DỒN tới từng phiên bản + phần tăng so với bản ngay trước (cho cột phiên bản và các ô số liệu).
 * Kết quả cùng thứ tự với revisions: [{ words, files, sources, addedWords, addedFiles, addedSources, addressChanged }]
 */
export const buildStats = (revisions) => {
  let words = 0
  let files = 0
  let sources = 0
  return revisions.map((revision) => {
    const addedWords = countWords(textOf(revision))
    words += addedWords
    files += revision.evidences.length
    sources += revision.sources.length
    return {
      words,
      files,
      sources,
      addedWords,
      addedFiles: revision.evidences.length,
      addedSources: revision.sources.length,
      addressChanged: Boolean(revision.previousAddress),
    }
  })
}

/**
 * Số thứ tự TOÀN HỒ SƠ của mục đầu tiên trong lời đề nghị của từng phiên bản: các lần đề nghị nối tiếp nhau
 * (lần 1 có mục 1–3, lần 2 bắt đầu từ mục 4...). Giúp câu trả lời của Chuyên gia đánh số liền mạch.
 */
export const buildItemOffsets = (revisions) => {
  let offset = 0
  return revisions.map((revision) => {
    const start = offset
    offset += Math.max(revision.requestItems.length, revision.answers.length)
    return start
  })
}

/**
 * So sánh phiên bản A (from) với B (to), cả hai là SỐ phiên bản (from < to).
 * Trả về:
 *   - older   : các lần bổ sung đã có ở A (giữ nguyên, hiện thu gọn)
 *   - added   : các lần bổ sung thêm sau A, tới B (tô xanh)
 *   - fromAddress / toAddress, addressChanged
 *   - oldFiles / newFiles, oldSources / newSources (kèm số phiên bản đã thêm)
 *   - changedFields : số mục thay đổi trên tổng 7 mục của hồ sơ
 */
export const compareRevisions = (revisions, from, to) => {
  const original = revisions[0]
  const older = revisions.slice(1, from)
  const added = revisions.slice(from, to)
  const fromAddress = revisions[from - 1].address
  const toAddress = revisions[to - 1].address
  const addressChanged = fromAddress !== toAddress
  const withNumber = (list, key) =>
    list.flatMap((revision) => revision[key].map((item) => ({ ...item, number: revision.number })))
  const oldFiles = withNumber(revisions.slice(0, from), 'evidences')
  const newFiles = withNumber(added, 'evidences')
  const oldSources = withNumber(revisions.slice(0, from), 'sources')
  const newSources = withNumber(added, 'sources')
  // 7 mục của hồ sơ: tiêu đề, loại phản ánh, tóm tắt, thời điểm, địa điểm, nội dung, tư liệu
  const changedFields =
    (added.some((revision) => textOf(revision)) ? 1 : 0) + (addressChanged ? 1 : 0) + (newFiles.length ? 1 : 0)
  return { original, older, added, fromAddress, toAddress, addressChanged, oldFiles, newFiles, oldSources, newSources, changedFields }
}

/**
 * Số phiên bản của hồ sơ, đếm từ nhật ký xử lý (detail.timeline) để trang Theo dõi hồ sơ không phải gọi thêm API:
 * bản gốc + mỗi bước người gửi bổ sung thông tin (actor REPORTER, trạng thái IN_REVIEW, giống backend).
 */
export const countRevisions = (timeline = []) =>
  1 + timeline.filter((entry) => entry.actor === 'REPORTER' && entry.status === 'IN_REVIEW').length
