
import { useState } from 'react'
import ContributorSection from '../contributor/ContributorSection'
import { useAsyncData } from '../../hooks/useAsyncData'
import { expertFieldService } from '../../services/expertFieldService'
import { expertUpgradeService } from '../../services/expertUpgradeService'
import '../../assets/styles/upgrade-role-section.css'

// TungTT - Iteration 3 - Task 3
// Citizen đăng ký nâng cấp thành CTV hoặc Expert.
// Giữ nguyên luồng đăng ký Contributor hiện tại.

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_FILES = 5

const ALLOWED_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx',
]

const STATUS_LABELS = {
  PENDING_EDITOR: 'Đang chờ Editor xét duyệt',
  PENDING_DEPUTY: 'Đang chờ Phó Tổng Biên tập xét duyệt',
  APPROVED: 'Đã được phê duyệt',
  REJECTED: 'Đã bị từ chối',
}

// ========================================
// Form đăng ký Expert
// ========================================

function ExpertRegistrationForm({ profile }) {
  const [expertise, setExpertise] = useState('')
  const [qualification, setQualification] = useState('')
  const [experience, setExperience] = useState('')
  const [files, setFiles] = useState([])

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Lấy lĩnh vực chuyên môn từ Database.
  const {
    data: fields,
    loading: fieldsLoading,
    error: fieldsError,
    reload: reloadFields,
  } = useAsyncData(
    () => expertFieldService.list(),
    'expert-registration-fields'
  )

  // Lấy danh sách đơn Expert của Citizen.
  const {
    data: applications,
    loading: historyLoading,
    error: historyError,
    reload: reloadHistory,
  } = useAsyncData(
    () => expertUpgradeService.mine(),
    'expert-applications-me'
  )

  const fieldList = Array.isArray(fields) ? fields : []
  const applicationList = Array.isArray(applications)
    ? applications
    : []

  // Kiểm tra Citizen có đơn đang chờ duyệt không.
  const hasPending = applicationList.some(item =>
    item.status === 'PENDING_EDITOR' ||
    item.status === 'PENDING_DEPUTY'
  )

  const handleFiles = (event) => {
    const selected = Array.from(event.target.files || [])

    setError('')
    event.target.value = ''

    if (selected.length === 0) return

    if (files.length + selected.length > MAX_FILES) {
      setError(`Chỉ được chọn tối đa ${MAX_FILES} tài liệu.`)
      return
    }

    const invalid = selected.find(file => {
      const extension = file.name
        .split('.')
        .pop()
        ?.toLowerCase()

      return (
        !ALLOWED_EXTENSIONS.includes(extension) ||
        file.size > MAX_FILE_SIZE ||
        file.size === 0
      )
    })

    if (invalid) {
      setError(
        'Chỉ nhận JPG, PNG, WEBP, PDF, DOC, DOCX; tối đa 10 MB/file.'
      )
      return
    }

    setFiles(current => [...current, ...selected])
  }

  const removeFile = (index) => {
    setFiles(current =>
      current.filter((_, i) => i !== index)
    )
  }

  // Citizen gửi đơn đăng ký Expert.
  const handleSubmitExpert = async (event) => {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (hasPending) {
      setError('Bạn đã có đơn Expert đang chờ xét duyệt.')
      return
    }

    if (!expertise) {
      setError('Vui lòng chọn lĩnh vực chuyên môn.')
      return
    }

    if (!qualification.trim()) {
      setError('Vui lòng nhập trình độ học vấn hoặc bằng cấp.')
      return
    }

    if (files.length === 0) {
      setError('Vui lòng đính kèm bằng cấp hoặc chứng chỉ.')
      return
    }

    try {
      setSubmitting(true)

      await expertUpgradeService.apply({
        expertise,
        qualification: qualification.trim(),
        experience: experience.trim(),
        files,
      })

      setSuccess(
        'Đã gửi đơn đăng ký Chuyên gia thành công. ' +
        'Hồ sơ đang chờ Editor xét duyệt.'
      )

      setExpertise('')
      setQualification('')
      setExperience('')
      setFiles([])

      // Tải lại lịch sử sau khi nộp đơn.
      await reloadHistory()
    } catch (err) {
      setError(
        err?.message ||
        'Không gửi được đơn Expert. Vui lòng thử lại.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="urs-form">

      {/* Tiêu đề */}
      <div className="urs-form__heading">
        <h3>Đăng ký trở thành Chuyên gia</h3>
        <p>
          Cung cấp thông tin chuyên môn và bằng cấp,
          chứng chỉ để được xét duyệt nâng cấp tài khoản.
        </p>
      </div>

      {/* Trạng thái gửi đơn */}
      {success && (
        <div className="urs-success" role="status">
          {success}
        </div>
      )}

      {error && (
        <p className="urs-error" role="alert">
          {error}
        </p>
      )}

      {hasPending && (
        <div className="urs-notice">
          Bạn đang có đơn đăng ký Expert chờ xét duyệt.
          Vui lòng theo dõi trạng thái bên dưới.
        </div>
      )}

      {/* Form đăng ký */}
      {!hasPending && !success && (
        <form onSubmit={handleSubmitExpert}>

          <div className="urs-grid">

            {/* Họ và tên */}
            <label className="urs-field">
              <span>Họ và tên</span>
              <input
                value={profile?.fullName || ''}
                disabled
              />
            </label>

            {/* Email */}
            <label className="urs-field">
              <span>Email</span>
              <input
                value={profile?.email || ''}
                disabled
              />
            </label>

            {/* Lĩnh vực lấy từ Database */}
            <div className="urs-field urs-field--full">
              <label htmlFor="expert-expertise">
                <span>Lĩnh vực chuyên môn <b>*</b></span>
              </label>

              <select
                id="expert-expertise"
                value={expertise}
                onChange={e => setExpertise(e.target.value)}
                disabled={
                  fieldsLoading ||
                  !!fieldsError ||
                  fieldList.length === 0
                }
                required
              >
                <option value="">
                  {fieldsLoading
                    ? 'Đang tải lĩnh vực...'
                    : '— Chọn lĩnh vực chuyên môn —'}
                </option>

                {fieldList.map(field => (
                  <option key={field.id} value={field.name}>
                    {field.name}
                  </option>
                ))}
              </select>

              {fieldsError && (
                <div className="urs-error">
                  <span>{fieldsError}</span>
                  {' '}
                  <button
                    type="button"
                    onClick={reloadFields}
                  >
                    Tải lại
                  </button>
                </div>
              )}

              {!fieldsLoading &&
                !fieldsError &&
                fieldList.length === 0 && (
                  <small>
                    Chưa có lĩnh vực đang hoạt động.
                  </small>
                )}
            </div>

            {/* Trình độ */}
            <label className="urs-field urs-field--full">
              <span>
                Trình độ học vấn / Bằng cấp <b>*</b>
              </span>

              <input
                value={qualification}
                maxLength={200}
                required
                placeholder="Ví dụ: Thạc sĩ Công nghệ thông tin"
                onChange={e => setQualification(e.target.value)}
              />
            </label>

            {/* Kinh nghiệm */}
            <label className="urs-field urs-field--full">
              <span>Kinh nghiệm chuyên môn</span>

              <textarea
                value={experience}
                rows={4}
                maxLength={1000}
                placeholder="Mô tả kinh nghiệm làm việc, nghiên cứu..."
                onChange={e => setExperience(e.target.value)}
              />
            </label>

            {/* Tài liệu */}
            <div className="urs-field urs-field--full">
              <span>
                Bằng cấp và chứng chỉ đính kèm <b>*</b>
              </span>

              <label className="urs-upload">
                <span className="urs-upload__icon">
                  ↑
                </span>

                <strong>Chọn ảnh hoặc tài liệu</strong>

                <small>
                  JPG, PNG, WEBP, PDF, DOC, DOCX
                </small>

                <small>
                  Tối đa 10 MB/file · Tối đa 5 file
                </small>

                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
                  onChange={handleFiles}
                />
              </label>

              {/* File đã chọn */}
              {files.length > 0 && (
                <div className="urs-files">
                  {files.map((file, index) => (
                    <div
                      className="urs-file"
                      key={`${file.name}-${index}`}
                    >
                      <div className="urs-file__details">
                        <strong>{file.name}</strong>

                        <small>
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </small>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        aria-label={`Xóa ${file.name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Thông báo xét duyệt */}
          <div className="urs-notice">
            Sau khi gửi, hồ sơ sẽ được Editor xét duyệt
            bước đầu và chuyển đến Phó Tổng Biên tập
            xét duyệt cuối. Tài khoản chỉ được nâng cấp
            thành Expert khi được chấp thuận.
          </div>

          {/* Gửi đơn */}
          <div className="urs-actions">
            <button
              type="submit"
              disabled={
                submitting ||
                historyLoading ||
                !!historyError ||
                fieldsLoading ||
                !!fieldsError ||
                !expertise ||
                !qualification.trim() ||
                files.length === 0
              }
            >
              {submitting
                ? 'Đang gửi hồ sơ...'
                : 'Gửi đơn đăng ký Chuyên gia'}
            </button>
          </div>
        </form>
      )}

      {/* ======================================
          THEO DÕI TRẠNG THÁI ĐƠN EXPERT
         ====================================== */}
      <div className="urs-history">
        <h3>Trạng thái đăng ký Chuyên gia</h3>

        <button
          type="button"
          className="urs-history__refresh"
          onClick={reloadHistory}
          disabled={historyLoading}
        >
          Làm mới trạng thái
        </button>

        {historyError && (
          <p className="urs-error">
            {historyError}
          </p>
        )}

        {historyLoading && (
          <p>Đang tải lịch sử đăng ký...</p>
        )}

        {!historyLoading &&
          !historyError &&
          applicationList.length === 0 && (
            <p>Chưa có đơn đăng ký Chuyên gia.</p>
          )}

        {!historyLoading &&
          applicationList.map(item => (
            <div
              className="urs-history__item"
              key={item.id}
            >
              <strong>
                {STATUS_LABELS[item.status] || item.status}
              </strong>

              <span>
                Lĩnh vực: {item.expertise}
              </span>

              <span>
                Bằng cấp: {item.qualification}
              </span>

              {item.createdAt && (
                <span>
                  Ngày gửi:{' '}
                  {new Date(item.createdAt).toLocaleString('vi-VN')}
                </span>
              )}

              {item.editorNote && (
                <p>
                  <b>Nhận xét Editor:</b>{' '}
                  {item.editorNote}
                </p>
              )}

              {item.deputyNote && (
                <p>
                  <b>Nhận xét Phó Tổng Biên tập:</b>{' '}
                  {item.deputyNote}
                </p>
              )}

              {item.status === 'REJECTED' && (
                <p className="urs-error">
                  Hồ sơ đã bị từ chối. Bạn có thể
                  chỉnh sửa thông tin và đăng ký lại.
                </p>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}

// ========================================
// Chuyển giữa đăng ký CTV và Expert
// ========================================

export default function UpgradeRoleSection({
  profile,
  profileKey,
}) {
  const [activeTab, setActiveTab] = useState('contributor')

  const isCitizen = profile?.role === 'CITIZEN'

  return (
    <section className="urs-section">

      <div className="urs-heading">
        <h2>Đăng ký nâng cấp tài khoản</h2>

        <p>
          Chọn vai trò bạn muốn đăng ký.
        </p>
      </div>

      {/* Hai tab */}
      <div
        className="urs-tabs"
        role="tablist"
        aria-label="Loại tài khoản"
      >
        {/* Tab Cộng tác viên */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'contributor'}
          className={
            `urs-tab ${
              activeTab === 'contributor'
                ? 'urs-tab--active'
                : ''
            }`
          }
          onClick={() => setActiveTab('contributor')}
        >
          <span className="urs-tab__icon">
            CTV
          </span>

          <span>
            <strong>Cộng tác viên</strong>
            <small>Đăng ký tham gia đưa tin</small>
          </span>
        </button>

        {/* Expert: chỉ Citizen được đăng ký */}
        {isCitizen && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'expert'}
            className={
              `urs-tab ${
                activeTab === 'expert'
                  ? 'urs-tab--active'
                  : ''
              }`
            }
            onClick={() => setActiveTab('expert')}
          >
            <span className="urs-tab__icon">
              ★
            </span>

            <span>
              <strong>Chuyên gia</strong>
              <small>Đăng ký lĩnh vực chuyên môn</small>
            </span>
          </button>
        )}
      </div>

      {/* Hiển thị form tương ứng */}
      <div className="urs-content">
        {activeTab === 'contributor' || !isCitizen ? (
          <ContributorSection profileKey={profileKey} />
        ) : (
          <ExpertRegistrationForm profile={profile} />
        )}
      </div>
    </section>
  )
}
