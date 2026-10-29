/**
 * Dữ liệu hiển thị dùng chung cho SÀNG LỌC AI (màn Kiểm tra tin trùng: routes/editor/EditorDuplicateCheck.jsx).
 */

/** Mức độ trùng theo % tương đồng AI chấm. Từ cao xuống thấp; dưới mức cuối thì backend không gợi ý. */
export const SIMILARITY_LEVELS = [
  { min: 85, label: 'Rất có thể trùng', tone: 'red', bar: 'red' },
  { min: 70, label: 'Có liên quan', tone: 'orange', bar: 'orange' },
  { min: 0, label: 'Ít khả năng trùng', tone: 'neutral', bar: 'neutral' },
]

/** Mức độ của một % tương đồng, ví dụ similarityLevel(94).label = "Rất có thể trùng". */
export const similarityLevel = (score) => SIMILARITY_LEVELS.find((level) => score >= level.min)

/** Dòng chú thích các mức, ví dụ "Từ 85%: rất có thể trùng · 70–84%: có liên quan · 60–69%: ít khả năng." */
export const similarityLegend = (threshold) =>
  `Từ 85%: rất có thể trùng · 70–84%: có liên quan · ${threshold}–69%: ít khả năng.`

/** 150 -> "150 m", 1200 -> "1,2 km" */
export const formatDistance = (meters) =>
  meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km`

/** 37 -> "37 phút", 150 -> "2 giờ", 11520 -> "8 ngày" */
export const formatGap = (minutes) => {
  if (minutes < 60) return `${minutes} phút`
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)} giờ`
  return `${Math.round(minutes / 60 / 24)} ngày`
}

/**
 * Các TÍN HIỆU khớp của một hồ sơ gợi ý (badge đỏ = khớp, xám = không khớp).
 * Ngưỡng "khớp": cách nhau ≤ 500 m, chênh ≤ 2 giờ, nội dung giống ≥ 70%, có ít nhất 1 ảnh tương tự.
 */
export const matchSignals = ({ distanceMeters, minutesApart, contentSimilarity, similarImages, totalImages }) => [
  { icon: 'mapPin', label: `Cách ${formatDistance(distanceMeters)}`, match: distanceMeters <= 500 },
  { icon: 'clock', label: `Chênh ${formatGap(minutesApart)}`, match: minutesApart <= 120 },
  { icon: 'fileText', label: `Nội dung giống ${contentSimilarity}%`, match: contentSimilarity >= 70 },
  { icon: 'image', label: `Ảnh tương tự ${similarImages}/${totalImages}`, match: similarImages > 0 },
]

/**
 * Cắt đoạn văn thành các mảnh, đánh dấu mảnh trùng với một trong các cụm `phrases` (không phân biệt hoa thường).
 * "Ngập ở ngã tư", ["ngã tư"] -> [{ text: 'Ngập ở ', match: false }, { text: 'ngã tư', match: true }]
 */
export const splitByPhrases = (text = '', phrases = []) => {
  const escaped = phrases.filter(Boolean).map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (escaped.length === 0) return [{ text, match: false }]
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi')
  return text
    .split(pattern)
    .filter(Boolean)
    .map((part) => ({ text: part, match: phrases.some((phrase) => phrase.toLowerCase() === part.toLowerCase()) }))
}
