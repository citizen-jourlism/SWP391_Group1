import { useMemo } from 'react'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Checkbox from '../ui/Checkbox'
import ChipSelect from '../ui/ChipSelect'
import Icon from '../ui/Icon'
import SelectField from '../ui/SelectField'
import TextField from '../ui/TextField'
import EvidenceUploader from '../submission/EvidenceUploader'
import { useForm } from '../../hooks/useForm'
import { AVAILABILITY_OPTIONS } from '../../lib/contributor'
import { toPayload } from '../../lib/payload'
import { MB } from '../../lib/submission'
import { createValidator, rules } from '../../lib/validators'
import { contributorService } from '../../services/contributorService'

/*
 * FORM ĐĂNG KÝ LÀM CỘNG TÁC VIÊN (SRS: Register as a Contributor / "Upgrade to CTV Form").
 * Nằm trong mục "Cộng tác viên" của trang Hồ sơ (ContributorSection), chỉ hiện khi người dân đủ điều kiện.
 *
 * Các ô (khớp backend ApplyContributorRequest):
 *   - Lĩnh vực am hiểu : chọn 1–3 chip (danh sách lấy từ backend)
 *   - Khu vực tác nghiệp, Thời gian nhận nhiệm vụ : ô chọn
 *   - Nghề nghiệp (≤100), Kinh nghiệm + lý do (50–2000 ký tự)
 *   - Giấy tờ : ảnh 2 mặt CCCD (+ thẻ nhà báo / chứng chỉ nếu có), JPG/PNG/PDF, dùng lại EvidenceUploader
 *   - Cam kết : bắt buộc tick
 * Thông tin cá nhân (họ tên, CCCD, ngày sinh...) KHÔNG nhập lại: toà soạn xem trực tiếp từ hồ sơ tài khoản.
 *
 * Props: options (từ GET /api/contributor-applications/me), onSubmitted(message), onCancel.
 */

const buildValidator = (options) =>
  createValidator({
    expertiseFields: [
      (fields) => (fields.length === 0 ? 'Vui lòng chọn ít nhất 1 lĩnh vực.' : ''),
      (fields) => (fields.length > options.maxExpertiseFields ? `Chọn tối đa ${options.maxExpertiseFields} lĩnh vực.` : ''),
    ],
    province: [rules.required('Vui lòng chọn khu vực tác nghiệp.')],
    occupation: [rules.required('Vui lòng nhập nghề nghiệp hiện tại.'), rules.maxLength(100, 'Nghề nghiệp tối đa 100 ký tự.')],
    availability: [rules.required('Vui lòng chọn thời gian có thể nhận nhiệm vụ.')],
    experience: [
      rules.required('Vui lòng giới thiệu kinh nghiệm và lý do đăng ký.'),
      rules.minLength(50, 'Phần giới thiệu tối thiểu 50 ký tự.'),
      rules.maxLength(2000, 'Phần giới thiệu tối đa 2000 ký tự.'),
    ],
    files: [
      (files) => (files.length === 0 ? 'Vui lòng tải lên ảnh CCCD (2 mặt) hoặc giấy tờ tuỳ thân.' : ''),
      (files) =>
        files.reduce((sum, item) => sum + item.file.size, 0) > options.maxTotalSizeMb * MB
          ? `Tổng dung lượng vượt quá ${options.maxTotalSizeMb}MB.`
          : '',
    ],
    commitment: [rules.required('Bạn cần đồng ý với cam kết của Cộng tác viên.')],
  })

function ContributorApplyForm({ options, onSubmitted, onCancel }) {
  const validate = useMemo(() => buildValidator(options), [options])
  const form = useForm(
    {
      expertiseFields: [],
      province: '',
      occupation: '',
      availability: '',
      experience: '',
      files: [], // mảng { id, file, previewUrl } (xem EvidenceUploader)
      commitment: false,
    },
    validate,
  )
  const provinceOptions = useMemo(() => options.provinces.map((name) => ({ value: name, label: name })), [options])

  const onSubmit = form.handleSubmit(async ({ files, ...values }) => {
    const response = await contributorService.apply(toPayload(values), files.map((item) => item.file))
    onSubmitted(response.message)
  })

  return (
    <form className="form apply-form" onSubmit={onSubmit} noValidate>
      <Alert type="error">{form.formError}</Alert>

      <ChipSelect
        label="Lĩnh vực am hiểu"
        required
        options={options.expertiseFields}
        value={form.values.expertiseFields}
        onChange={(fields) => form.setValue('expertiseFields', fields)}
        max={options.maxExpertiseFields}
        hint={`Chọn 1–${options.maxExpertiseFields} lĩnh vực bạn muốn đưa tin.`}
        error={form.errorOf('expertiseFields')}
      />

      <div className="form__row">
        <SelectField
          label="Khu vực tác nghiệp"
          placeholder="Chọn tỉnh/thành phố"
          options={provinceOptions}
          required
          {...form.field('province')}
        />
        <SelectField
          label="Thời gian nhận nhiệm vụ"
          placeholder="Chọn thời gian"
          options={AVAILABILITY_OPTIONS}
          required
          {...form.field('availability')}
        />
      </div>

      <TextField
        label="Nghề nghiệp hiện tại"
        icon="award"
        placeholder="Ví dụ: Giáo viên, sinh viên báo chí, kỹ sư..."
        required
        {...form.field('occupation')}
      />

      <TextField
        label="Kinh nghiệm và lý do đăng ký"
        multiline
        rows={5}
        counter={2000}
        placeholder="Bạn từng viết bài, chụp ảnh, tham gia hoạt động cộng đồng nào? Vì sao muốn làm Cộng tác viên?"
        required
        {...form.field('experience')}
      />

      <div className="field">
        <span className="field__label">
          Giấy tờ tuỳ thân<span className="field__required" aria-hidden="true">*</span>
        </span>
        <p className="field__hint">Ảnh 2 mặt CCCD; thêm thẻ nhà báo, chứng chỉ (nếu có). Chỉ toà soạn xem được các tệp này.</p>
        <EvidenceUploader
          files={form.values.files}
          onChange={(files) => form.setValue('files', files)}
          options={options}
          error={form.errorOf('files')}
        />
      </div>

      <Checkbox
        label="Tôi cam kết thông tin và giấy tờ cung cấp là chính xác, tuân thủ quy chế Cộng tác viên và Luật Báo chí."
        {...form.field('commitment')}
      />

      <div className="form__actions">
        <Button variant="secondary" onClick={onCancel} disabled={form.submitting}>
          Huỷ
        </Button>
        <Button type="submit" loading={form.submitting}>
          {!form.submitting && <Icon name="send" size={16} />}
          {form.submitting ? 'Đang nộp đơn...' : 'Nộp đơn đăng ký'}
        </Button>
      </div>
    </form>
  )
}

export default ContributorApplyForm
