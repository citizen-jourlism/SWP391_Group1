import Badge from '../ui/Badge'
import Icon from '../ui/Icon'
import { formatDateTime, formatFileSize } from '../../lib/format'
import { splitByPhrases } from '../../lib/screening'
import { FILE_TYPE_INFO } from '../../lib/submission'

/**
 * MỘT CỘT trong khối "So sánh chi tiết" của màn Kiểm tra tin trùng (routes/editor/EditorDuplicateCheck.jsx).
 * Thông tin / nội dung / tệp hiển thị bằng các class của SubmissionDetail (tracking.css: detail-facts, detail-content)
 * và EvidenceList (submit.css: evidence-list), chỉ thêm:
 *   - cụm từ AI thấy giống bên kia được tô vàng (<mark className="dup-mark">)
 *   - nhãn "Giống" cạnh tệp AI thấy giống tệp bên kia
 *
 * Props:
 *   - tag, tagTone   : nhãn đầu cột, ví dụ "Hồ sơ đang xét" (dark) / "Hồ sơ gợi ý · 94%" (orange)
 *   - status         : nhãn trạng thái bên phải (không bắt buộc) { label, tone }
 *   - record         : hồ sơ { trackingCode, title, createdAt, address, province, content, evidences, anonymous, assignedEditorName }
 *   - phrases        : các cụm từ cần tô vàng
 *   - similarUrls    : Set url các tệp giống bên kia
 *   - extraFact      : { label, value } ô thông tin thứ 2 (Người gửi / Phụ trách)
 */
function DuplicateSide({ tag, tagTone, status, record, phrases, similarUrls, extraFact }) {
  return (
    <article className="dup-side">
      <div className="detail-head__top">
        <Badge tone={tagTone}>{tag}</Badge>
        {status ? <Badge tone={status.tone}>{status.label}</Badge> : <span className="data-table__mono">{record.trackingCode}</span>}
      </div>
      <h3>{record.title}</h3>
      <dl className="detail-facts">
        <div>
          <dt>Gửi lúc</dt>
          <dd>{formatDateTime(record.createdAt)}</dd>
        </div>
        <div>
          <dt>{extraFact.label}</dt>
          <dd>{extraFact.value}</dd>
        </div>
        <div className="detail-facts__wide">
          <dt>Địa điểm</dt>
          <dd>{[record.address, record.province].filter(Boolean).join(', ')}</dd>
        </div>
      </dl>
      <p className="detail-content">
        {splitByPhrases(record.content, phrases).map((part, index) =>
          part.match ? (
            <mark key={index} className="dup-mark">
              {part.text}
            </mark>
          ) : (
            part.text
          ),
        )}
      </p>
      {record.evidences.length === 0 ? (
        <p className="evidence-list__empty">Không có tệp đính kèm.</p>
      ) : (
        <ul className="evidence-list">
          {record.evidences.map((evidence) => {
            const typeInfo = FILE_TYPE_INFO[evidence.fileType] ?? FILE_TYPE_INFO.DOCUMENT
            return (
              <li key={evidence.url}>
                <Icon name={typeInfo.icon} size={18} />
                <span>
                  <a href={evidence.url} target="_blank" rel="noreferrer">
                    {evidence.fileName}
                  </a>
                  <small>
                    {typeInfo.label} · {formatFileSize(evidence.size)}
                  </small>
                </span>
                {similarUrls.has(evidence.url) && <Badge tone="red">Giống</Badge>}
              </li>
            )
          })}
        </ul>
      )}
    </article>
  )
}

export default DuplicateSide
