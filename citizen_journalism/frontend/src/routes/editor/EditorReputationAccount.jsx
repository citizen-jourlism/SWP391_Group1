import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Icon from '../../components/ui/Icon'
import Pagination from '../../components/ui/Pagination'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../lib/format'
import { CATEGORY_BY_VALUE, SUBMISSION_STATUS } from '../../lib/submission'
import { ROLE_LABELS, STATUS_INFO } from '../../lib/roles'
import { RESEARCH_STATUS } from '../../lib/research'
import { editorService } from '../../services/editorService'

const PAGE_SIZE = 10
const EMPTY_PAGE = { data: { items: [], page: 0, size: PAGE_SIZE, totalItems: 0, totalPages: 0 } }

function EditorReputationAccount() {
  const { accountId } = useParams()
  const [accountPage, setAccountPage] = useState(0)
  const [researchPage, setResearchPage] = useState(0)
  const { data: account, error: accountError } = useAsyncData(
    () => editorService.getReputationAccount(accountId),
    accountId,
  )
  const { data: submissions, error: submissionsError, loading: submissionsLoading } = useAsyncData(
    () => editorService.listAccountSubmissions(accountId, { page: accountPage, size: PAGE_SIZE }),
    `${accountId}|submissions|${accountPage}`,
  )
  const { data: research, error: researchError, loading: researchLoading } = useAsyncData(
    () => account?.role === 'EXPERT'
      ? editorService.listAccountResearch(accountId, { page: researchPage, size: PAGE_SIZE })
      : Promise.resolve(EMPTY_PAGE),
    `${accountId}|research|${account?.role ?? 'loading'}|${researchPage}`,
  )

  if (accountError && !account) {
    return <div className="desk-detail"><Link to="/editor/reputation" className="desk-back"><Icon name="arrowLeft" size={16} />Uy tín và xử phạt</Link><Alert type="error">{accountError}</Alert></div>
  }
  if (!account) return <div className="skeleton skeleton--page" />

  const accountStatus = STATUS_INFO[account.status]
  return (
    <div className="desk-detail">
      <Link to="/editor/reputation" className="desk-back"><Icon name="arrowLeft" size={16} />Uy tín và xử phạt</Link>
      <Alert type="error">{accountError || submissionsError || researchError}</Alert>
      <section className="admin-panel">
        <div className="admin-panel__header">
          <div><h2>{account.fullName}</h2><span>{ROLE_LABELS[account.role]}</span></div>
          <Badge tone={accountStatus?.tone}>{accountStatus?.label ?? account.status}</Badge>
        </div>
        <dl className="applicant__facts">
          <div><dt>Mã tài khoản</dt><dd>{account.id}</dd></div>
          <div><dt>Email</dt><dd>{account.email}</dd></div>
          <div><dt>Điểm uy tín</dt><dd><strong>{account.reputationScore ?? 0} / 100</strong></dd></div>
        </dl>
        <Alert type="info">Bài hợp lệ: +5 điểm (bài nghiên cứu Expert: +10 điểm, tối đa 100). Tin giả: gỡ bài và -10 điểm. Dưới 80 điểm tài khoản sẽ bị khóa.</Alert>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__header">
          <h2>Tin bài đã gửi</h2>
          {submissions && <span>{submissions.totalItems} bài</span>}
        </div>
        <Alert type="error">{submissionsError}</Alert>
        <div className={`table-wrap ${submissionsLoading && submissions ? 'is-loading' : ''}`}>
          <table className="data-table reputation-account-table">
            <thead><tr><th>Bài viết</th><th>Mã hồ sơ</th><th>Ngày gửi</th><th>Trạng thái</th><th>Điểm</th><th /></tr></thead>
            <tbody>
              {!submissions && submissionsLoading && <tr><td colSpan={6}><div className="skeleton skeleton--row" /></td></tr>}
              {submissions?.items.length === 0 && <tr><td colSpan={6} className="data-table__empty">Tài khoản chưa gửi tin bài.</td></tr>}
              {submissions?.items.map((item) => {
                const category = CATEGORY_BY_VALUE[item.category]
                const status = SUBMISSION_STATUS[item.status]
                return (
                  <tr key={item.trackingCode}>
                    <td><strong>{item.title}</strong><div className="data-table__note">{category?.label}</div></td>
                    <td className="data-table__mono">{item.trackingCode}</td>
                    <td>{formatDateTime(item.createdAt)}</td>
                    <td><Badge tone={status?.tone}>{status?.label ?? item.status}</Badge></td>
                    <td>{item.reputationReviewed ? <Badge tone="green">Đã xử lý</Badge> : <Badge tone="orange">Chờ xử lý</Badge>}</td>
                    <td className="data-table__actions">
                      <Link
                        to={`/editor/reputation/accounts/${encodeURIComponent(account.id)}/submissions/${encodeURIComponent(item.trackingCode)}`}
                        className="desk-open"
                      >
                        {item.reputationReviewed ? 'Xem' : 'Đánh giá'}<Icon name="chevronDown" size={14} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {submissions && <Pagination {...submissions} onChange={setAccountPage} />}
      </section>

      {account.role === 'EXPERT' && (
        <section className="admin-panel">
          <div className="admin-panel__header">
            <h2>Bài nghiên cứu Expert</h2>
            {research && <span>{research.totalItems} bài</span>}
          </div>
          <Alert type="error">{researchError}</Alert>
          <div className={`table-wrap ${researchLoading && research ? 'is-loading' : ''}`}>
            <table className="data-table reputation-account-table">
              <thead><tr><th>Bài nghiên cứu</th><th>Lĩnh vực</th><th>Ngày nộp</th><th>Trạng thái</th><th>Điểm</th><th /></tr></thead>
              <tbody>
                {!research && researchLoading && <tr><td colSpan={6}><div className="skeleton skeleton--row" /></td></tr>}
                {research?.items.length === 0 && <tr><td colSpan={6} className="data-table__empty">Chưa có bài nghiên cứu được nộp.</td></tr>}
                {research?.items.map((item) => {
                  const status = RESEARCH_STATUS[item.status]
                  return (
                    <tr key={item.id}>
                      <td><strong>{item.title}</strong><div className="data-table__note">{item.abstractText}</div></td>
                      <td>{item.field || '—'}</td>
                      <td>{formatDateTime(item.submittedAt)}</td>
                      <td><Badge tone={status?.tone}>{status?.label ?? item.status}</Badge></td>
                      <td>{item.reputationReviewed ? <Badge tone="green">Đã xử lý</Badge> : <Badge tone="orange">Chờ xử lý</Badge>}</td>
                      <td className="data-table__actions">
                        <Link to={`/editor/reputation/accounts/${encodeURIComponent(account.id)}/research/${item.id}`} className="desk-open">
                          {item.reputationReviewed ? 'Xem' : 'Đánh giá'}<Icon name="chevronDown" size={14} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {research && <Pagination {...research} onChange={setResearchPage} />}
        </section>
      )}
    </div>
  )
}

export default EditorReputationAccount
