import Badge from '../ui/Badge'
import Icon from '../ui/Icon'
import SelectField from '../ui/SelectField'
import { formatDateTime, formatFileSize } from '../../lib/format'
import {
  FOLD_THRESHOLD,
  buildItemOffsets,
  compareRevisions,
  formatShort,
  revisionTitle,
  textOf,
} from '../../lib/revisionHistory'
import { FILE_TYPE_INFO } from '../../lib/submission'

/**
 * Khung "SO SÁNH PHIÊN BẢN" của trang Lịch sử chỉnh sửa (routes/SubmissionHistory.jsx). Chỉ hiển thị.
 * CSS: assets/styles/history.css.
 *
 * BỐ CỤC: 2 ô chọn A / B -> 3 ô số liệu -> lý do có phiên bản mới (lời đề nghị của toà soạn) -> chú giải màu
 *   -> Địa điểm (chỉ khi đổi) -> Nội dung: bản gốc (xám) + các lần bổ sung cũ (thu gọn) + các lần bổ sung mới (xanh)
 *   -> Nguồn tham khảo (nếu có) -> Tư liệu -> dòng "Không thay đổi: ..."
 *
 * Ô chọn: mới nhất ở trên; A chỉ có các bản cũ hơn B, B chỉ có các bản mới hơn A -> không chọn được cặp sai.
 *
 * Props: revisions (cũ -> mới), stats (buildStats), from / to (số phiên bản A / B), onChange({ from, to })
 */
function RevisionCompare({ revisions, stats, from, to, onChange }) {
  const diff = compareRevisions(revisions, from, to)
  const offsets = buildItemOffsets(revisions)
  const latest = revisions.length
  const statFrom = stats[from - 1]
  const statTo = stats[to - 1]
  const hasSources = statTo.sources > 0

  const optionOf = (revision) => ({
    value: revision.number,
    label: `Phiên bản ${revision.number} · ${formatShort(revision.createdAt)}${revision.number === 1 ? ' · Bản gốc' : ''}${
      revision.number === latest ? ' (hiện tại)' : ''
    }`,
  })
  const newestFirst = [...revisions].reverse()
  const requests = diff.added.filter((revision) => revision.requestedAt || revision.requestMessage || revision.requestItems.length)
  const unchanged = ['Tiêu đề', 'Loại phản ánh', 'Tóm tắt', 'Thời điểm xảy ra']
  if (!diff.addressChanged) unchanged.push('Địa điểm')
  if (hasSources && diff.newSources.length === 0) unchanged.unshift(`Nguồn tham khảo (${statTo.sources})`)

  return (
    <section className="detail-card rh-compare">
      <div className="rh-compare__head">
        <h3>So sánh phiên bản</h3>
        <div className="rh-pickers">
          <SelectField
            label="Từ phiên bản (A)"
            value={from}
            options={newestFirst.filter((revision) => revision.number < to).map(optionOf)}
            onChange={(event) => onChange({ from: Number(event.target.value), to })}
          />
          <Icon name="chevronDown" size={18} className="rh-pickers__arrow" />
          <SelectField
            label="Đến phiên bản (B)"
            value={to}
            options={newestFirst.filter((revision) => revision.number > from).map(optionOf)}
            onChange={(event) => onChange({ from, to: Number(event.target.value) })}
          />
        </div>
      </div>

      <div className="rh-metrics">
        <Metric label="Số từ" from={statFrom.words} to={statTo.words} />
        <Metric label="Tư liệu" from={statFrom.files} to={statTo.files} />
        {hasSources ? (
          <Metric label="Nguồn tham khảo" from={statFrom.sources} to={statTo.sources} />
        ) : (
          <div className="rh-metric">
            <small>Mục thay đổi</small>
            <strong>{diff.changedFields} / 7</strong>
          </div>
        )}
      </div>

      {requests.length > 0 && <RequestReason requests={requests} offsets={offsets} to={to} />}

      <p className="rh-legend">
        <span>
          <ins className="rh-ins">Chữ xanh</ins> thêm mới
        </span>
        {diff.addressChanged && (
          <span>
            <del className="rh-del">Chữ đỏ gạch</del> đã thay
          </span>
        )}
        <span className="rh-same">Chữ xám: giữ nguyên</span>
      </p>

      {diff.addressChanged && (
        <Field title="Địa điểm" badge={<Badge tone="orange">Đã sửa</Badge>}>
          <p>
            <del className="rh-del">{diff.fromAddress}</del> <ins className="rh-ins">{diff.toAddress}</ins>
          </p>
        </Field>
      )}

      <Field title="Nội dung" badge={diff.added.some(textOf) ? <Badge tone="green">Có nội dung mới</Badge> : null}>
        <div className="rh-block rh-block--same">
          <span className="rh-block__label">Nội dung gốc · {formatShort(diff.original.createdAt)}</span>
          <p className="rh-same">{diff.original.content}</p>
        </div>
        {/* Lần bổ sung đã có ở A: nhiều thì gom 1 dòng, ít thì mỗi lần 1 dòng thu gọn */}
        {diff.older.length > FOLD_THRESHOLD ? (
          <Fold label={`${diff.older.length} lần bổ sung trước (lần 1 – ${diff.older.length})`}>
            {diff.older.map((revision) => (
              <SupplementText key={revision.number} revision={revision} offset={offsets[revision.number - 1]} same />
            ))}
          </Fold>
        ) : (
          diff.older.map((revision) => (
            <Fold key={revision.number} label={`${revisionTitle(revision.number)} · ${formatShort(revision.createdAt)}`}>
              <SupplementText revision={revision} offset={offsets[revision.number - 1]} same />
            </Fold>
          ))
        )}
        {diff.added.map((revision) => (
          <SupplementText key={revision.number} revision={revision} offset={offsets[revision.number - 1]} />
        ))}
      </Field>

      {hasSources && (
        <Field
          title={`Nguồn tham khảo (${statTo.sources})`}
          badge={diff.newSources.length > 0 ? <Badge tone="green">+{diff.newSources.length} nguồn</Badge> : null}
        >
          <ul className="evidence-list">
            {diff.oldSources.map((source, index) => (
              <SourceItem key={`old-${index}`} source={source} />
            ))}
            {diff.newSources.map((source, index) => (
              <SourceItem key={`new-${index}`} source={source} tag={newTag(source.number, from, to)} />
            ))}
          </ul>
        </Field>
      )}

      <Field
        title={`Tư liệu (${statTo.files})`}
        badge={diff.newFiles.length > 0 ? <Badge tone="green">+{diff.newFiles.length} tệp</Badge> : null}
      >
        {diff.oldFiles.length > FOLD_THRESHOLD ? (
          <Fold label={`${diff.oldFiles.length} tệp đã có từ các phiên bản trước`}>
            <FileList files={diff.oldFiles} />
          </Fold>
        ) : (
          <FileList files={diff.oldFiles} />
        )}
        <FileList files={diff.newFiles} tagOf={(file) => newTag(file.number, from, to)} />
        {statTo.files === 0 && <p className="evidence-list__empty">Không có tệp đính kèm.</p>}
      </Field>

      <p className="rh-unchanged">
        <Icon name="check" size={16} />
        <span>Không thay đổi: {unchanged.join(' · ')}.</span>
      </p>
    </section>
  )
}

/** Nhãn của mục mới thêm: so 2 bản liền nhau thì "Mới", cách nhiều bản thì ghi rõ "Lần N". */
const newTag = (number, from, to) => (to - from === 1 ? 'Mới' : `Lần ${number - 1}`)

/** 1 ô số liệu: "97 → 139 +42" */
function Metric({ label, from, to }) {
  return (
    <div className="rh-metric">
      <small>{label}</small>
      <strong>
        {from} → {to}
        {to > from && <em>+{to - from}</em>}
      </strong>
    </div>
  )
}

/** 1 mục được so sánh (Địa điểm, Nội dung, Tư liệu...): đầu mục xám + thân mục */
function Field({ title, badge, children }) {
  return (
    <div className="rh-field">
      <div className="rh-field__head">
        <h4>{title}</h4>
        {badge}
      </div>
      <div className="rh-field__body">{children}</div>
    </div>
  )
}

/** Dòng thu gọn bằng thẻ <details> (trình duyệt tự mở / đóng khi bấm, không cần state). */
function Fold({ label, children }) {
  return (
    <details className="rh-fold">
      <summary>
        <Icon name="chevronDown" size={16} />
        <span className="rh-fold__label">{label}</span>
        <span className="rh-fold__hint">Giữ nguyên · bấm để xem</span>
      </summary>
      <div className="rh-fold__body">{children}</div>
    </details>
  )
}

/**
 * Phần chữ của 1 lần bổ sung: ô bổ sung chung (content) hoặc từng câu trả lời kèm câu hỏi của Biên tập viên.
 * same = true: phần giữ nguyên (chữ xám, nằm trong dòng thu gọn); false: phần thêm mới (khối xanh).
 * offset: số mục đã có ở các lần đề nghị trước, để đánh số câu hỏi liền mạch (4, 5... thay vì lại 1).
 */
function SupplementText({ revision, offset, same }) {
  const label = `${same ? '' : '+ '}${revisionTitle(revision.number)} · ${formatShort(revision.createdAt)}`
  const blockClass = same ? 'rh-block rh-block--same' : 'rh-block'
  if (revision.answers.length > 0) {
    return (
      <>
        {!same && <span className="rh-block__label rh-block__label--add">{label}</span>}
        {same && <span className="rh-block__label">{label}</span>}
        {revision.answers.map((answer) => (
          <div key={answer.item} className={blockClass}>
            <p className="rh-qa__q">
              <span className="rh-qa__num">{offset + answer.item}</span>
              {answer.question ?? `Mục ${answer.item}`}
            </p>
            <p className={same ? 'rh-same' : ''}>{answer.answer}</p>
          </div>
        ))}
      </>
    )
  }
  return (
    <div className={blockClass}>
      <span className="rh-block__label">{label}</span>
      <p className={same ? 'rh-same' : ''}>{revision.content ?? 'Chỉ gửi thêm tệp / nguồn, không có nội dung chữ.'}</p>
    </div>
  )
}

/** Lý do có phiên bản mới: lời đề nghị bổ sung của Biên tập viên (1 lần hoặc nhiều lần nếu A cách B nhiều bản). */
function RequestReason({ requests, offsets, to }) {
  const items = (revision) =>
    revision.requestItems.length > 0 && (
      <ol start={offsets[revision.number - 1] + 1}>
        {revision.requestItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    )
  return (
    <div className="rh-reason">
      <Icon name="info" size={18} />
      {requests.length === 1 ? (
        <div>
          <strong>Vì sao có phiên bản {to}:</strong> Biên tập viên đề nghị bổ sung lúc {formatDateTime(requests[0].requestedAt)}
          {requests[0].requestMessage && <div className="rh-reason__text">“{requests[0].requestMessage}”</div>}
          {items(requests[0])}
        </div>
      ) : (
        <div>
          <strong>{requests.length} lần toà soạn đề nghị bổ sung:</strong>
          <ul className="rh-reason__list">
            {requests.map((revision) => (
              <li key={revision.number}>
                {formatShort(revision.requestedAt)}
                {revision.requestMessage && ` · “${revision.requestMessage}”`}
                {items(revision)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** Danh sách tệp (giống EvidenceList) + nhãn "+ Mới" / "+ Lần N" cho tệp thêm sau A. */
function FileList({ files, tagOf }) {
  if (files.length === 0) return null
  return (
    <ul className="evidence-list">
      {files.map((file) => {
        const typeInfo = FILE_TYPE_INFO[file.fileType] ?? FILE_TYPE_INFO.DOCUMENT
        return (
          <li key={file.url} className={tagOf ? 'is-added' : ''}>
            <Icon name={typeInfo.icon} size={18} />
            <span>
              <a href={file.url} target="_blank" rel="noreferrer">
                {file.fileName}
              </a>
              {tagOf && <b className="rh-tag-new">+ {tagOf(file)}</b>}
              <small>
                {typeInfo.label} · {formatFileSize(file.size)}
              </small>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** 1 nguồn tham khảo; có đường dẫn thì bấm mở tab mới. */
function SourceItem({ source, tag }) {
  return (
    <li className={tag ? 'is-added' : ''}>
      <Icon name="link" size={18} />
      <span>
        {source.url && /^https?:\/\//i.test(source.url) ? (
          <a href={source.url} target="_blank" rel="noreferrer">
            {source.title}
          </a>
        ) : (
          <strong>{source.title}</strong>
        )}
        {tag && <b className="rh-tag-new">+ {tag}</b>}
        {source.url && <small>{source.url}</small>}
      </span>
    </li>
  )
}

export default RevisionCompare
