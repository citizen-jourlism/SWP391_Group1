/**
 * ĐÁNH GIÁ MỨC TÁC ĐỘNG (UC Editor "Assess Impact Score"): tiêu chí, mức độ, giới hạn ô nhập.
 * Dùng ở routes/editor/EditorImpactAssessment.jsx. Backend tính lại điểm và quyết định mức thật
 * (ImpactScoreService.evaluate); hàm evaluateImpact dưới đây chỉ để xem trước mức khi BTV đang tick.
 * Màn hình KHÔNG hiện điểm, chỉ hiện mức. Số điểm phải khớp backend và thang công khai ở routes/Homepage.jsx.
 */

/** 3 tiêu chí; value = tên enum ở backend (AssessImpactRequest.Area / People / Nature). */
export const IMPACT_CRITERIA = [
  {
    key: 'area',
    title: 'A. Khu vực ảnh hưởng',
    hint: 'Phạm vi địa lý nơi sự việc tác động tới, không phải nơi người gửi đang ở.',
    options: [
      { value: 'SPOT', points: 5, label: 'Một hộ, một điểm cụ thể', example: 'Một ngôi nhà, một đoạn hẻm, một cửa hàng' },
      { value: 'WARD', points: 10, label: 'Một phường / xã, khu dân cư', example: 'Một khu phố, chung cư, khu chợ' },
      { value: 'DISTRICT', points: 20, label: 'Nhiều phường / xã, cả quận / huyện', example: 'Một tuyến đường dài, nhiều khu dân cư' },
      { value: 'PROVINCE', points: 30, label: 'Toàn tỉnh / thành hoặc liên tỉnh', example: 'Tuyến quốc lộ, lưu vực sông, cả thành phố' },
    ],
  },
  {
    key: 'people',
    title: 'B. Số người bị ảnh hưởng',
    hint: 'Ước tính theo nội dung, bằng chứng và kết quả xác minh hiện có.',
    options: [
      { value: 'UNDER_10', points: 5, label: 'Dưới 10 người', example: 'Cá nhân, một gia đình' },
      { value: 'UP_TO_100', points: 10, label: '10 - 100 người', example: 'Một nhóm hộ, một tổ dân phố' },
      { value: 'UP_TO_1000', points: 20, label: '101 - 1.000 người', example: 'Một khu dân cư, một trường học' },
      { value: 'OVER_1000', points: 30, label: 'Trên 1.000 người', example: 'Cả phường trở lên, lượng lớn người đi đường' },
    ],
  },
  {
    key: 'nature',
    title: 'C. Tính chất vấn đề',
    hint: 'Chọn mức nặng nhất mà sự việc đang gây ra.',
    options: [
      { value: 'NUISANCE', points: 5, label: 'Phiền toái, dịch vụ công', example: 'Rác thải, đèn đường, tiếng ồn, mất mỹ quan' },
      { value: 'RIGHTS', points: 15, label: 'Quyền lợi, tài sản, kinh tế', example: 'Chậm bàn giao, thu phí sai, thủ tục hành chính' },
      { value: 'SAFETY', points: 25, label: 'Sức khoẻ, môi trường, an toàn công cộng', example: 'Nước bẩn, ô nhiễm, công trình nguy cơ sập' },
      { value: 'LIFE_THREAT', points: 40, label: 'Đe doạ tính mạng, thiên tai, thảm hoạ', example: 'Cháy nổ, lũ quét, sạt lở đang diễn ra' },
    ],
  },
]

/** 4 mức (submissions.priority), thứ tự từ thấp tới cao; nhãn + màu giống PRIORITY_LABELS (lib/verificationReview.js). */
export const IMPACT_LEVELS = [
  { code: 'LOW', label: 'Thấp', tone: 'green', min: 15 },
  { code: 'MEDIUM', label: 'Trung bình', tone: 'blue', min: 40 },
  { code: 'HIGH', label: 'Cao', tone: 'orange', min: 60 },
  { code: 'BREAKING', label: 'Khẩn cấp', tone: 'red', min: 80 },
]

export const IMPACT_LEVEL_BY_CODE = Object.fromEntries(IMPACT_LEVELS.map((level) => [level.code, level]))

/** Giới hạn ô nhập, khớp backend (AssessImpactRequest). */
export const IMPACT_LIMITS = { reasonMin: 10, reasonMax: 300, noteMax: 500 }

/** Mức HIGH / BREAKING: Phó TBT chuyển tiếp, Tổng biên tập duyệt chốt. */
export const escalatesToEic = (code) => code === 'HIGH' || code === 'BREAKING'

/**
 * Xem trước mức khi BTV đang tick (giống ImpactScoreService.evaluate).
 * @param choices { area, people, nature } = value đã chọn; sensitive = cờ nội dung nhạy cảm
 * @returns null khi chưa chọn đủ 3 tiêu chí, ngược lại { level, raised, reasons }
 */
export function evaluateImpact(choices, sensitive) {
  const points = IMPACT_CRITERIA.map(
    (criterion) => criterion.options.find((option) => option.value === choices[criterion.key])?.points,
  )
  if (points.some((value) => value == null)) return null
  const total = points.reduce((sum, value) => sum + value, 0)
  const byScore = [...IMPACT_LEVELS].reverse().find((level) => total >= level.min)
  const reasons = []
  if (choices.nature === 'LIFE_THREAT') reasons.push('sự việc đe doạ tính mạng')
  if (sensitive) reasons.push('nội dung nhạy cảm')
  const raised = reasons.length > 0 && IMPACT_LEVELS.indexOf(byScore) < 2
  return { level: raised ? IMPACT_LEVEL_BY_CODE.HIGH : byScore, raised, reasons, baseLevel: byScore }
}
