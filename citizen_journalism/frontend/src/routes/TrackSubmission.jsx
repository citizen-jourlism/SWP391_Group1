import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AccountLayout from '../components/layout/AccountLayout'
import SubmissionDetail from '../components/submission/SubmissionDetail'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import OtpInput from '../components/ui/OtpInput'
import TextField from '../components/ui/TextField'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useForm } from '../hooks/useForm'
import { SUBMITTER_ROLES } from '../lib/roles'
import { TRACKING_CODE_REGEX } from '../lib/submission'
import { createValidator, rules } from '../lib/validators'
import { submissionService } from '../services/submissionService'
import '../assets/styles/tracking.css'

/*
 * TRANG TRA CỨU HỒ SƠ — đường dẫn /track, KHÔNG cần đăng nhập (SRS 4.1.2: tra cứu bằng Tracking Code + PIN 6 số).
 * Mở từ: menu "Tra cứu hồ sơ" trên thanh đầu trang, ô tra cứu ở trang chủ (/track?code=KB-2026-0001 -> điền sẵn mã).
 *
 * LUỒNG:
 *   1. Nhập mã hồ sơ + mã PIN rồi bấm "Tra cứu" (hoặc nhấn Enter).
 *   2. POST /api/tracking. Đúng -> hiện SubmissionDetail (tiến độ, nhật ký xử lý, nội dung đã gửi).
 *   3. Sai -> báo "Mã hồ sơ hoặc mã PIN không đúng", xoá PIN để nhập lại.
 *      Sai 5 lần liên tiếp -> backend khoá tra cứu hồ sơ đó 15 phút (chống dò PIN).
 * Người dân đã đăng nhập thấy thêm lối tắt sang "Hồ sơ đã gửi" (xem mọi hồ sơ của mình, không cần PIN).
 */

const validate = createValidator({
  trackingCode: [
    rules.required('Vui lòng nhập mã hồ sơ.'),
    rules.pattern(TRACKING_CODE_REGEX, 'Mã hồ sơ có dạng KB-2026-0001.'),
  ],
  pin: [rules.required('Vui lòng nhập mã PIN.'), rules.digits(6, 'Mã PIN gồm đúng 6 chữ số.')],
})

function TrackSubmission() {
  useDocumentTitle('Tra cứu hồ sơ')
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const prefilledCode = searchParams.get('code')?.trim().toUpperCase() ?? ''

  const form = useForm({ trackingCode: prefilledCode, pin: '' }, validate)
  const [detail, setDetail] = useState(null)
  // Đặt con trỏ vào ô PIN khi: đã có sẵn mã từ đường dẫn, hoặc vừa nhập sai PIN (PIN bị xoá để nhập lại)
  const [focusPin, setFocusPin] = useState(Boolean(prefilledCode))

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const response = await submissionService.track(values.trackingCode.trim().toUpperCase(), values.pin)
      setDetail(response.data)
      window.scrollTo({ top: 0, behavior: 'smooth' }) // Kết quả thay chỗ form ở đầu trang
    } catch (error) {
      form.setValue('pin', '') // Xoá PIN sai để nhập lại
      setFocusPin(true)
      throw error // Ném tiếp để useForm hiện thông báo lỗi
    }
  })

  /** Tra cứu hồ sơ khác: quay lại form trống. */
  const reset = () => {
    setDetail(null)
    form.reset({ trackingCode: '', pin: '' })
    setFocusPin(false)
  }

  const isSubmitter = user && SUBMITTER_ROLES.includes(user.role)

  return (
    <AccountLayout
      title="Tra cứu hồ sơ"
      subtitle="Nhập mã hồ sơ và mã PIN trong biên nhận (hoặc email biên nhận) để xem tiến độ xử lý."
    >
      {detail ? (
        <div className="track-result">
          <div className="track-result__bar">
            <span>
              <Icon name="checkCircle" size={18} />
              Kết quả tra cứu hồ sơ <strong>{detail.trackingCode}</strong>
            </span>
            <Button variant="secondary" className="btn--sm" onClick={reset}>
              <Icon name="search" size={14} />
              Tra cứu hồ sơ khác
            </Button>
          </div>
          <SubmissionDetail detail={detail} />
        </div>
      ) : (
        <div className="track-layout">
          <form className="detail-card track-form" onSubmit={onSubmit} noValidate>
            <span className="track-form__icon">
              <Icon name="search" size={26} />
            </span>
            <Alert type="error">{form.formError}</Alert>
            <TextField
              label="Mã hồ sơ"
              icon="fileText"
              placeholder="KB-2026-0001"
              autoComplete="off"
              autoFocus={!prefilledCode}
              maxLength={20}
              required
              {...form.field('trackingCode')}
            />
            <div className="field">
              <span className="field__label">
                Mã PIN<span className="field__required" aria-hidden="true">*</span>
              </span>
              <OtpInput
                value={form.values.pin}
                onChange={(pin) => form.setValue('pin', pin)}
                disabled={form.submitting}
                invalid={Boolean(form.formError)}
                autoFocus={focusPin}
              />
              {/* Vừa báo sai PIN ở hộp lỗi phía trên (PIN đã bị xoá) thì không nhắc thêm "Vui lòng nhập mã PIN" cho đỡ rối */}
              {form.errorOf('pin') && !form.formError && (
                <p className="field__error" role="alert">
                  <Icon name="alertCircle" size={14} />
                  {form.errorOf('pin')}
                </p>
              )}
            </div>
            <Button type="submit" block loading={form.submitting}>
              {form.submitting ? 'Đang tra cứu...' : 'Tra cứu'}
            </Button>
          </form>

          {/* ----- Hướng dẫn bên cạnh ----- */}
          <aside className="track-help">
            <div className="detail-card">
              <h3>
                <Icon name="info" size={18} />
                Tìm mã ở đâu?
              </h3>
              <ul>
                <li>Mã hồ sơ và mã PIN hiện ngay sau khi bạn gửi phản ánh thành công.</li>
                <li>Hai mã cũng được gửi kèm trong email biên nhận của toà soạn.</li>
                <li>Nhập sai PIN 5 lần liên tiếp, tra cứu hồ sơ đó sẽ tạm khoá 15 phút.</li>
              </ul>
            </div>
            {isSubmitter && (
              <Link to="/account/submissions" className="track-help__shortcut">
                <Icon name="fileText" size={20} />
                <span>
                  <strong>Xem tất cả hồ sơ của bạn</strong>
                  <small>Bạn đang đăng nhập, không cần nhập PIN.</small>
                </span>
                <Icon name="chevronDown" size={18} className="track-help__arrow" />
              </Link>
            )}
          </aside>
        </div>
      )}
    </AccountLayout>
  )
}

export default TrackSubmission
