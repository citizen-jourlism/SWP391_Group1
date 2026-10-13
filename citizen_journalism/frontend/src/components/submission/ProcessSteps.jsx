import Icon from '../ui/Icon'
import { PROCESS_STAGES } from '../../lib/submission'
import '../../assets/styles/submit.css'

/**
 * THANH TIẾN TRÌNH các giai đoạn xử lý hồ sơ (PROCESS_STAGES trong lib/submission.js).
 * CSS: assets/styles/submit.css (mục "Các bước xử lý").
 * Dùng ở: SubmissionReceipt (ngay sau khi gửi), SubmissionDetail (trang theo dõi hồ sơ).
 *
 * Props:
 *   - stage  : chỉ số giai đoạn HIỆN TẠI (lấy từ SUBMISSION_STATUS[status].stage). Các giai đoạn trước đó = đã xong.
 *   - ended  : true nếu hồ sơ đã dừng (bị từ chối, huỷ...) -> giai đoạn hiện tại hiện dấu X màu đỏ.
 *   - layout : 'vertical' (danh sách dọc, mặc định) | 'horizontal' (hàng ngang, tự chuyển dọc trên điện thoại)
 */
function ProcessSteps({ stage, ended = false, layout = 'vertical' }) {
  return (
    <ol className={`steps steps--${layout}`}>
      {PROCESS_STAGES.map((item, index) => {
        const state = index < stage ? 'is-done' : index === stage ? (ended ? 'is-failed' : 'is-current') : ''
        return (
          <li key={item.title} className={state} aria-current={index === stage ? 'step' : undefined}>
            <span className="steps__dot">
              {state === 'is-done' && <Icon name="check" size={12} strokeWidth={3} />}
              {state === 'is-failed' && <Icon name="x" size={12} strokeWidth={3} />}
              {(state === 'is-current' || state === '') && index + 1}
            </span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export default ProcessSteps
