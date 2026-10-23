import { useState } from 'react'
import Alert from '../ui/Alert'
import Icon from '../ui/Icon'
import { AVAILABILITY_LABELS } from '../../lib/contributor'
import { openProtectedFile } from '../../lib/files'
import { formatFileSize } from '../../lib/format'
import { FILE_TYPE_INFO, fileTypeOf } from '../../lib/submission'
import '../../assets/styles/contributor.css'

/**
 * NỘI DUNG 1 ĐƠN ĐĂNG KÝ CTV (chỉ xem): lĩnh vực, khu vực, nghề nghiệp, thời gian, lời giới thiệu + giấy tờ.
 * Dùng chung ở: ApplicationTracker (người dân xem đơn của mình), routes/editor/EditorApplicationDetail (BTV xét đơn).
 * CSS: assets/styles/contributor.css.
 *
 * Props:
 *   - application   : ApplicationView từ backend
 *   - documentPath  : hàm (index) => đường dẫn API xem giấy tờ. Người dân và BTV dùng 2 API khác nhau
 *                     (contributorService.documentPath / editorService.documentPath) nên truyền từ ngoài vào.
 *
 * Giấy tờ là tệp RIÊNG TƯ (ảnh CCCD...) nên không có link trực tiếp: bấm "Xem" -> openProtectedFile tải kèm token.
 */
function ApplicationSummary({ application, documentPath }) {
  const [error, setError] = useState('')

  const openDocument = async (index) => {
    setError('')
    try {
      await openProtectedFile(documentPath(index))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="app-summary">
      <dl className="app-facts">
        <div className="app-facts__wide">
          <dt>Lĩnh vực am hiểu</dt>
          <dd className="app-facts__tags">
            {application.expertiseFields.map((field) => (
              <span key={field} className="tag">
                {field}
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt>Khu vực tác nghiệp</dt>
          <dd>{application.province}</dd>
        </div>
        <div>
          <dt>Nghề nghiệp</dt>
          <dd>{application.occupation}</dd>
        </div>
        <div>
          <dt>Thời gian nhận nhiệm vụ</dt>
          <dd>{AVAILABILITY_LABELS[application.availability] ?? application.availability}</dd>
        </div>
        <div className="app-facts__wide">
          <dt>Kinh nghiệm và lý do đăng ký</dt>
          {/* white-space: pre-line (CSS) giữ các lần xuống dòng */}
          <dd className="app-facts__text">{application.experience}</dd>
        </div>
      </dl>

      <h4 className="app-summary__title">Giấy tờ đã nộp ({application.documents.length})</h4>
      <Alert type="error">{error}</Alert>
      <ul className="doc-list">
        {application.documents.map((document) => {
          const typeInfo = FILE_TYPE_INFO[fileTypeOf(document.contentType)]
          return (
            <li key={document.index}>
              <span className="doc-list__icon">
                <Icon name={typeInfo.icon} size={18} />
              </span>
              <span className="doc-list__meta">
                <strong title={document.name}>{document.name}</strong>
                <small>
                  {typeInfo.label} · {formatFileSize(document.size)}
                </small>
              </span>
              <button type="button" className="link-button" onClick={() => openDocument(document.index)}>
                <Icon name="eye" size={15} />
                Xem
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default ApplicationSummary
