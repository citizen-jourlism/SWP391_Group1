import { useMemo, useState } from 'react'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Checkbox from '../ui/Checkbox'
import Icon from '../ui/Icon'
import SelectField from '../ui/SelectField'
import TextField from '../ui/TextField'
import CategoryPicker from './CategoryPicker'
import EvidenceUploader from './EvidenceUploader'
import { useForm } from '../../hooks/useForm'
import { toPayload } from '../../lib/payload'
import { MB, RELATIONSHIPS, REPORT_CATEGORIES } from '../../lib/submission'
import { createValidator, nowLocalIso, rules } from '../../lib/validators'
import { submissionService } from '../../services/submissionService'

/*
 * FORM GỬI TIN / KHIẾU NẠI. Nằm trong trang routes/SubmitReport.jsx.
 * CSS: assets/styles/submit.css.
 *
 * 4 PHẦN:
 *   1. Loại phản ánh   : Tin nóng 24/7 / Khiếu nại - Tố cáo / Phóng sự điều tra / Ý kiến chuyên gia (bắt buộc).
 *                        Chỉ hiện các loại vai trò của người dùng được gửi (options.categories, ví dụ người dân: 2 loại đầu).
 *   2. Nội dung sự việc : Tiêu đề (10–200), Tóm tắt (≤300), Nội dung chi tiết (50–5000),
 *                         Thời điểm xảy ra (không ở tương lai), Tỉnh/Thành phố, Địa chỉ (≤250)
 *   3. Tư liệu          : ít nhất 1 tệp JPG/PNG/MP4/MP3/PDF, giới hạn dung lượng + số tệp theo loại (EvidenceUploader)
 *   4. Người gửi        : Gửi ẩn danh (mặc định tắt). Tắt -> bắt buộc Họ tên, SĐT, Email; CMND/CCCD (9/12 số)
 *                         không bắt buộc. Mối quan hệ với sự việc (không bắt buộc). Cam kết Luật Báo chí (bắt buộc).
 *
 * Quy tắc kiểm tra khớp backend (CreateSubmissionRequest.java + SubmissionService.validate).
 * Họ tên / SĐT / Email / CCCD được ĐIỀN SẴN từ hồ sơ tài khoản (prop `profile`), người dùng sửa được.
 *
 * Gửi thành công -> gọi onSubmitted(biênNhận) để trang cha chuyển sang màn hình biên nhận.
 */

const PERSONAL_ID_REGEX = /^(\d{9}|\d{12})$/ // CMND 9 số hoặc CCCD 12 số (khớp ValidationRules.PERSONAL_ID_REGEX)

/** Điều kiện cho các ô thông tin liên hệ: chỉ kiểm tra khi KHÔNG gửi ẩn danh. */
const named = (values) => !values.anonymous
const whenNamed = (...ruleList) => ruleList.map((rule) => rules.when(named, rule))

/** Tạo hàm kiểm tra. Cần `options` (giới hạn tổng dung lượng tệp lấy từ backend) nên tạo trong component. */
const buildValidator = (options) =>
  createValidator({
    category: [rules.required('Vui lòng chọn loại phản ánh.')],
    title: [
      rules.required('Vui lòng nhập tiêu đề.'),
      rules.minLength(10, 'Tiêu đề tối thiểu 10 ký tự.'),
      rules.maxLength(200, 'Tiêu đề tối đa 200 ký tự.'),
    ],
    summary: [rules.required('Vui lòng nhập tóm tắt sự việc.'), rules.maxLength(300, 'Tóm tắt tối đa 300 ký tự.')],
    content: [
      rules.required('Vui lòng mô tả chi tiết sự việc.'),
      rules.minLength(50, 'Nội dung chi tiết tối thiểu 50 ký tự.'),
      rules.maxLength(5000, 'Nội dung chi tiết tối đa 5000 ký tự.'),
    ],
    incidentAt: [
      rules.required('Vui lòng chọn thời điểm xảy ra sự việc.'),
      rules.notFuture('Thời điểm xảy ra không được ở tương lai.'),
    ],
    province: [rules.required('Vui lòng chọn tỉnh/thành phố.')],
    address: [rules.required('Vui lòng nhập địa chỉ.'), rules.maxLength(250, 'Địa chỉ tối đa 250 ký tự.')],
    files: [
      (files) => (files.length === 0 ? 'Vui lòng đính kèm ít nhất 1 tệp tư liệu.' : ''),
      (files) =>
        files.reduce((sum, item) => sum + item.file.size, 0) > options.maxTotalSizeMb * MB
          ? `Tổng dung lượng các tệp vượt quá ${options.maxTotalSizeMb}MB.`
          : '',
    ],
    fullName: whenNamed(rules.required('Vui lòng nhập họ và tên.'), rules.maxLength(100, 'Họ và tên tối đa 100 ký tự.')),
    phone: whenNamed(rules.required('Vui lòng nhập số điện thoại.'), rules.phone()),
    email: whenNamed(rules.required('Vui lòng nhập email.'), rules.email()),
    citizenId: whenNamed(rules.optional(rules.pattern(PERSONAL_ID_REGEX, 'CMND/CCCD gồm 9 hoặc 12 chữ số.'))),
    policyAgreed: [rules.required('Bạn cần xác nhận cam kết trước khi gửi.')],
  })

/** Cuộn tới ô lỗi đầu tiên (form dài, lỗi có thể nằm khuất phía trên). */
const scrollToFirstError = () =>
  requestAnimationFrame(() =>
    document
      .querySelector('.report-form [role="alert"]')
      ?.closest('.field, .uploader, .checkbox, .category-picker')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
  )

function SectionHeader({ step, title, description }) {
  return (
    <header className="form-card__head">
      <span className="form-card__step">{step}</span>
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
    </header>
  )
}

function ReportForm({ options, profile, initialCategory, onSubmitted }) {
  const validate = useMemo(() => buildValidator(options), [options])
  const form = useForm(
    {
      // Loại chọn sẵn (từ đường dẫn ?type=...) mà vai trò không được gửi thì chọn thẻ ĐẦU TIÊN đang hiển thị
      category: options.categories.includes(initialCategory)
        ? initialCategory
        : REPORT_CATEGORIES.find((item) => options.categories.includes(item.value))?.value,
      title: '',
      summary: '',
      content: '',
      incidentAt: '',
      province: '',
      address: '',
      files: [], // mảng { id, file, previewUrl } (xem EvidenceUploader)
      anonymous: false,
      fullName: profile.fullName ?? '',
      phone: profile.phone ?? '',
      email: profile.email ?? '',
      citizenId: profile.citizenId ?? '',
      relationship: '',
      policyAgreed: false,
    },
    validate,
  )
  const [progress, setProgress] = useState(0) // % tệp đã tải lên
  const provinceOptions = useMemo(() => options.provinces.map((name) => ({ value: name, label: name })), [options])
  const anonymous = form.values.anonymous

  const submit = form.handleSubmit(async ({ files, ...values }) => {
    setProgress(0)
    // Ẩn danh -> KHÔNG gửi thông tin liên hệ lên máy chủ (để trống = null)
    const contact = anonymous ? { fullName: '', phone: '', email: '', citizenId: '' } : {}
    const response = await submissionService.create(
      toPayload({ ...values, ...contact }),
      files.map((item) => item.file),
      setProgress,
    )
    onSubmitted(response.data)
  })

  const onSubmit = async (event) => {
    await submit(event)
    scrollToFirstError()
  }

  const submitLabel = !form.submitting
    ? 'Gửi thông tin'
    : progress < 100
      ? `Đang tải lên ${progress}%...`
      : 'Đang xử lý...'

  return (
    <form className="report-form" onSubmit={onSubmit} noValidate>
      <Alert type="error">{form.formError}</Alert>

      {/* ----- 1. Loại phản ánh ----- */}
      <section className="form-card">
        <SectionHeader step={1} title="Loại phản ánh" description="Chọn loại phù hợp nhất để toà soạn chuyển đúng bộ phận." />
        <CategoryPicker allowed={options.categories} {...form.field('category')} />
      </section>

      {/* ----- 2. Nội dung sự việc ----- */}
      <section className="form-card">
        <SectionHeader step={2} title="Nội dung sự việc" description="Mô tả rõ diễn biến, nguyên nhân và các bên liên quan." />
        <div className="form">
          <TextField
            label="Tiêu đề"
            placeholder="Ví dụ: Rác thải tồn đọng nhiều ngày tại cổng chợ Phường 5"
            counter={200}
            required
            {...form.field('title')}
          />
          <TextField
            label="Tóm tắt"
            multiline
            rows={2}
            placeholder="Một vài câu nêu vấn đề chính"
            counter={300}
            required
            {...form.field('summary')}
          />
          <TextField
            label="Nội dung chi tiết"
            multiline
            rows={8}
            placeholder="Sự việc diễn ra khi nào, ở đâu, như thế nào? Ai liên quan? Đã phản ánh với cơ quan nào chưa?"
            counter={5000}
            required
            {...form.field('content')}
          />
          <div className="form__row">
            <TextField
              label="Thời điểm xảy ra"
              icon="calendar"
              type="datetime-local"
              max={nowLocalIso()} // Lịch không cho chọn thời điểm trong tương lai
              required
              {...form.field('incidentAt')}
            />
            <SelectField
              label="Tỉnh / Thành phố"
              placeholder="Chọn tỉnh/thành phố"
              options={provinceOptions}
              required
              {...form.field('province')}
            />
          </div>
          <TextField
            label="Địa chỉ"
            icon="mapPin"
            placeholder="Số nhà, đường, phường/xã hoặc địa danh dễ nhận biết"
            counter={250}
            required
            {...form.field('address')}
          />
        </div>
      </section>

      {/* ----- 3. Tư liệu ----- */}
      <section className="form-card">
        <SectionHeader
          step={3}
          title="Tư liệu, bằng chứng"
          description="Ảnh, video, ghi âm hoặc giấy tờ liên quan đến sự việc."
        />
        <EvidenceUploader
          files={form.values.files}
          onChange={(files) => form.setValue('files', files)}
          options={options}
          error={form.errorOf('files')}
        />
      </section>

      {/* ----- 4. Thông tin người gửi ----- */}
      <section className="form-card">
        <SectionHeader step={4} title="Thông tin người gửi" description="Thông tin được điền sẵn từ hồ sơ tài khoản, bạn có thể sửa." />

        {/* Công tắc ẩn danh: thẻ checkbox thật được ẩn, phần "công tắc" vẽ bằng CSS (giống cách làm của Checkbox) */}
        <label className={`anon-toggle ${anonymous ? 'is-on' : ''}`}>
          <input
            type="checkbox"
            className="anon-toggle__input"
            checked={anonymous}
            onChange={(event) => form.setValue('anonymous', event.target.checked)}
          />
          <span className="anon-toggle__icon">
            <Icon name={anonymous ? 'eyeOff' : 'eye'} size={20} />
          </span>
          <span className="anon-toggle__text">
            <strong>Gửi ẩn danh</strong>
            <small>Không lưu họ tên, số điện thoại, email, CMND/CCCD trong hồ sơ. Biên nhận gửi về email tài khoản.</small>
          </span>
          <span className="anon-toggle__switch" aria-hidden="true" />
        </label>

        <div className="form">
          {anonymous ? (
            <p className="anon-note">
              <Icon name="shield" size={18} />
              Danh tính của bạn được bảo vệ. Toà soạn chỉ có thể tra cứu người gửi khi Tổng biên tập phê duyệt theo căn cứ pháp lý.
            </p>
          ) : (
            <>
              <div className="form__row">
                <TextField label="Họ và tên" icon="user" autoComplete="name" required {...form.field('fullName')} />
                <TextField
                  label="Số điện thoại"
                  icon="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                  {...form.field('phone')}
                />
              </div>
              <div className="form__row">
                <TextField
                  label="Email"
                  icon="mail"
                  type="email"
                  autoComplete="email"
                  hint="Nhận mã PIN và cập nhật tiến độ."
                  required
                  {...form.field('email')}
                />
                <TextField
                  label="CMND / CCCD"
                  icon="creditCard"
                  inputMode="numeric"
                  placeholder="9 hoặc 12 chữ số (không bắt buộc)"
                  {...form.field('citizenId')}
                />
              </div>
            </>
          )}
          <SelectField
            label="Mối quan hệ với sự việc"
            placeholder="Không chọn"
            options={RELATIONSHIPS}
            {...form.field('relationship')}
          />
        </div>
      </section>

      {/* ----- Cam kết + gửi ----- */}
      <section className="form-card form-card--submit">
        <Checkbox
          label="Tôi cam kết thông tin cung cấp là trung thực và chịu trách nhiệm trước pháp luật theo quy định của Luật Báo chí."
          {...form.field('policyAgreed')}
        />
        {form.submitting && (
          <div className="upload-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${progress}%` }} />
          </div>
        )}
        <Button type="submit" block loading={form.submitting}>
          {!form.submitting && <Icon name="send" size={18} />}
          {submitLabel}
        </Button>
      </section>
    </form>
  )
}

export default ReportForm
