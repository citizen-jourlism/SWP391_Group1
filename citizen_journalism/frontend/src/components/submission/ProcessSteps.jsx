import Icon from '../ui/Icon'
import { PROCESS_STAGES } from '../../lib/submission'
import '../../assets/styles/submit.css'

/**
 * THANH TIẾN TRÌNH các giai đoạn xử lý (mặc định: PROCESS_STAGES của hồ sơ trong lib/submission.js).
 * CSS: assets/styles/submit.css (mục "Các bước xử lý").
 * Dùng ở: SubmissionReceipt, SubmissionDetail (hồ sơ); ApplicationTracker, trang xét đơn của BTV (đơn CTV, stages riêng).
 *
 * Props:
 *   - stages : danh sách giai đoạn [{ title, description }] (không truyền = các giai đoạn xử lý hồ sơ)
 *   - stage  : chỉ số giai đoạn HIỆN TẠI (lấy từ SUBMISSION_STATUS[status].stage). Các giai đoạn trước đó = đã xong.
 *   - ended  : true nếu hồ sơ đã dừng (bị từ chối, huỷ...) -> giai đoạn hiện tại hiện dấu X màu đỏ.
 *   - layout : 'vertical' (danh sách dọc, mặc định) | 'horizontal' (hàng ngang, tự chuyển dọc trên điện thoại)
 */
function ProcessSteps({ stages = PROCESS_STAGES, stage, ended = false, layout = 'vertical' }) {
  return (
    // --steps: số cột của dạng hàng ngang (CSS đọc biến này để chia đều các bước)
    <ol className={`steps steps--${layout}`} style={{ '--steps': stages.length }}>
      {stages.map((item, index) => {
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
