import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import SelectField from '../../components/ui/SelectField'
import TextField from '../../components/ui/TextField'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useForm } from '../../hooks/useForm'
import { useLocationOptions } from '../../hooks/useLocationOptions'
import {
  ACTIVE_ASSIGNMENT_STATUSES,
  ASSIGNABLE_SUBMISSION_STATUSES,
  defaultDeadline,
  SCORE_FILTERS,
  SORT_OPTIONS,
} from '../../lib/assignment'
import { toPayload } from '../../lib/payload'
import { CATEGORY_BY_VALUE } from '../../lib/submission'
import { createValidator, rules } from '../../lib/validators'
import { editorService } from '../../services/editorService'
import '../../assets/styles/admin.css' // Ô tìm kiếm .search-box
import '../../assets/styles/assignment.css'
import '../../assets/styles/submit.css' // Màu icon theo loại phản ánh (.category-card__icon--...)

/*
 * CHỌN CỘNG TÁC VIÊN ĐỂ GIAO NHIỆM VỤ — /editor/queue/:code/assign (mở từ nút "Giao CTV xác minh" của hồ sơ).
 * Giao diện như màn chọn quán trên ứng dụng giao đồ ăn:
 *   - Danh sách dọc, mỗi CTV là 1 hàng ngang: khu vực, số việc đang làm, điểm hiệu suất.
 *   - Thanh lọc ngang: ô tìm kiếm, tỉnh (MẶC ĐỊNH là nơi xảy ra vụ việc), phường/xã, điểm hiệu suất, sắp xếp.
 *   - Chọn 1 hàng -> thanh "giỏ hàng" dưới đáy hiện ra để nhập hạn hoàn thành, chỉ dẫn rồi bấm giao.
 * Luồng: EditorAssignContributor -> editorService -> FieldAssignmentController -> FieldAssignmentService.
 * Giao xong quay về trang hồ sơ (EditorSubmissionDetail), trang đó hiện nhiệm vụ vừa giao.
 */

const validate = createValidator({
  deadline: [rules.required('Vui lòng chọn hạn hoàn thành.'), rules.future('Hạn hoàn thành phải ở tương lai.')],
  note: [rules.optional(rules.maxLength(1000, 'Chỉ dẫn tối đa 1000 ký tự.'))],
})

function EditorAssignContributor() {
  const { code } = useParams()
  const { data: detail, error } = useAsyncData(() => editorService.getSubmission(code), code)
  const { data: latest, loading: latestLoading } = useAsyncData(() => editorService.getLatestAssignment(code), `latest|${code}`)

  const backLink = (
    <Link to={`/editor/queue/${code}`} className="desk-back">
      <Icon name="arrowLeft" size={16} />
      Quay lại hồ sơ
    </Link>
  )
  if (error) {
    return (
      <div className="desk-detail">
        {backLink}
        <Alert type="error">{error}</Alert>
      </div>
    )
  }
  if (!detail || latestLoading) return <div className="skeleton skeleton--page" aria-busy="true" aria-label="Đang tải hồ sơ" />

  const category = CATEGORY_BY_VALUE[detail.category]
  // Báo sớm cho Biên tập viên; backend vẫn kiểm tra lại khi giao để chống 2 người giao cùng lúc.
  const assignedTo = ACTIVE_ASSIGNMENT_STATUSES.includes(latest?.status) ? latest.contributorName : null
  const closed = !ASSIGNABLE_SUBMISSION_STATUSES.includes(detail.status)

  return (
    <div className="desk-detail assign-page">
      {backLink}

      <section className="admin-panel assign-case">
        <span className={`category-card__icon category-card__icon--${category?.slug ?? 'complaint'}`}>
          <Icon name={category?.icon ?? 'fileText'} size={18} />
        </span>
        <div>
          <small>
            {code} · {category?.label}
          </small>
          <strong>{detail.title}</strong>
          <p>
            <Icon name="mapPin" size={14} />
            {detail.address}, {detail.province}
          </p>
        </div>
      </section>

      {closed && <Alert type="info">Hồ sơ này đã được xử lý xong, không thể giao nhiệm vụ.</Alert>}
      {!closed && assignedTo && <Alert type="info">Hồ sơ này đã được giao cho {assignedTo}.</Alert>}
      {!closed && !assignedTo && <ContributorPicker code={code} incidentProvince={detail.province} />}
    </div>
  )
}

/** Phần chọn CTV: tách riêng để bộ lọc khu vực nhận đúng tỉnh của vụ việc SAU khi tải xong hồ sơ. */
function ContributorPicker({ code, incidentProvince }) {
  const [province, setProvince] = useState(incidentProvince ?? '')
  const [ward, setWard] = useState('')
  const [keyword, setKeyword] = useState('')
  const [minScore, setMinScore] = useState('')
  const [sort, setSort] = useState('RECOMMENDED')
  const [selected, setSelected] = useState(null)
  const searchText = useDebouncedValue(keyword.trim())

  const { provinceOptions, wardOptions } = useLocationOptions(province)
  const { data: candidates, error, loading } = useAsyncData(
    () => editorService.listCandidates({ code, province, ward, q: searchText, minScore, sort }),
    `${province}|${ward}|${searchText}|${minScore}|${sort}`,
  )

  /** Đổi tỉnh thì bỏ phường/xã đang lọc, vì mỗi tỉnh có danh sách phường/xã riêng. */
  const changeProvince = (value) => {
    setProvince(value)
    setWard('')
  }

  return (
    <>
      <section className="admin-panel assign-filters">
        <label className="search-box">
          <Icon name="search" size={18} />
          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm tên, địa chỉ"
            aria-label="Tìm Cộng tác viên"
          />
        </label>
        <SelectField
          options={provinceOptions}
          placeholder="Mọi tỉnh/thành phố"
          value={province}
          onChange={(event) => changeProvince(event.target.value)}
          aria-label="Lọc theo tỉnh/thành phố"
        />
        <SelectField
          options={wardOptions}
          placeholder="Mọi phường/xã"
          value={ward}
          disabled={!province}
          onChange={(event) => setWard(event.target.value)}
          aria-label="Lọc theo phường/xã"
        />
        <SelectField
          options={SCORE_FILTERS}
          placeholder="Mọi mức điểm"
          value={minScore}
          onChange={(event) => setMinScore(event.target.value)}
          aria-label="Lọc theo điểm hiệu suất"
        />
        <SelectField
          options={SORT_OPTIONS}
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          aria-label="Sắp xếp"
        />
      </section>

      <Alert type="error">{error}</Alert>

      {!candidates && !error && (
        <div className="assign-list">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="skeleton skeleton--row" />
          ))}
        </div>
      )}

      {candidates?.length === 0 && (
        <section className="admin-panel assign-empty">
          <Icon name="mapPin" size={28} />
          <strong>Không có Cộng tác viên phù hợp</strong>
          <p>Thử giảm điểm tối thiểu hoặc mở rộng ra các khu vực khác.</p>
          {province && (
            <Button variant="secondary" className="btn--sm" onClick={() => changeProvince('')}>
              Xem mọi khu vực
            </Button>
          )}
        </section>
      )}

      {candidates?.length > 0 && (
        <>
          <p className="assign-count">{candidates.length} Cộng tác viên phù hợp</p>
          <ul className={`assign-list ${loading ? 'is-loading' : ''}`}>
            {candidates.map((candidate) => (
              <li key={candidate.id}>
                <ContributorRow
                  candidate={candidate}
                  selected={selected?.id === candidate.id}
                  onSelect={() => setSelected(selected?.id === candidate.id ? null : candidate)}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {selected && <AssignBasket code={code} contributor={selected} onClear={() => setSelected(null)} />}
    </>
  )
}

/** Một hàng Cộng tác viên trong danh sách. Bấm lần nữa để bỏ chọn. */
function ContributorRow({ candidate, selected, onSelect }) {
  const area = [candidate.ward, candidate.province].filter(Boolean).join(', ')

  return (
    <button
      type="button"
      className={`assign-row ${selected ? 'is-selected' : ''}`}
      aria-pressed={selected}
      aria-label={`Chọn ${candidate.fullName}, điểm hiệu suất ${candidate.performanceScore}`}
      onClick={onSelect}
    >
      <Avatar name={candidate.fullName} src={candidate.avatarUrl} size={48} />
      <span className="assign-row__main">
        <span className="assign-row__name">
          <strong>{candidate.fullName}</strong>
          {candidate.sameArea && <Badge tone="green">Cùng khu vực</Badge>}
        </span>
        <span className="assign-row__area">
          <Icon name="mapPin" size={13} />
          {area || 'Chưa cập nhật khu vực'}
        </span>
        {candidate.address && <small>{candidate.address}</small>}
      </span>
      <span className="assign-row__stats">
        <span>
          <b>{candidate.activeTasks}</b> đang làm
        </span>
        <span>
          <b>{candidate.completedTasks}</b> đã xong
        </span>
      </span>
      <span className="assign-row__score" title="Điểm hiệu suất">
        <Icon name="star" size={14} />
        {candidate.performanceScore}
      </span>
      <span className="assign-row__check">{selected && <Icon name="check" size={14} strokeWidth={3} />}</span>
    </button>
  )
}

/** Thanh chốt việc giao (như giỏ hàng): dính ở đáy trang, chỉ hiện khi đã chọn 1 CTV. */
function AssignBasket({ code, contributor, onClear }) {
  const navigate = useNavigate()
  const form = useForm({ deadline: defaultDeadline(), note: '' }, validate)
  const basketRef = useRef(null)

  // Màn hình hẹp: thanh nằm cuối trang, chọn CTV xong tự cuộn tới để nhập tiếp
  useEffect(() => {
    basketRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [contributor.id])

  const submit = form.handleSubmit(async (values) => {
    const response = await editorService.assign({ trackingCode: code, contributorId: contributor.id, ...toPayload(values) })
    navigate(`/editor/queue/${code}`, { state: { notice: response.message } })
  })

  return (
    <form ref={basketRef} className="admin-panel assign-basket" noValidate onSubmit={submit}>
      <Alert type="error">{form.formError}</Alert>
      <div className="assign-basket__who">
        <Avatar name={contributor.fullName} src={contributor.avatarUrl} size={44} />
        <div>
          <small>Giao cho</small>
          <strong>{contributor.fullName}</strong>
        </div>
        <button type="button" className="assign-basket__clear" onClick={onClear} aria-label="Bỏ chọn Cộng tác viên">
          <Icon name="x" size={16} />
        </button>
      </div>
      <TextField label="Hạn hoàn thành" type="datetime-local" required {...form.field('deadline')} />
      <TextField label="Chỉ dẫn tác nghiệp" placeholder="Cần kiểm tra gì tại hiện trường?" maxLength={1000} {...form.field('note')} />
      <Button type="submit" loading={form.submitting}>
        <Icon name="send" size={16} />
        Giao nhiệm vụ
      </Button>
    </form>
  )
}

export default EditorAssignContributor
