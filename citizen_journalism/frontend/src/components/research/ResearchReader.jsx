import ArticleBody from './ArticleBody'
import Avatar from '../ui/Avatar'
import { formatDateTime } from '../../lib/format'

/**
 * XEM BÀI NGHIÊN CỨU ĐÃ NỘP (chỉ đọc), trình bày như một bài báo hoàn chỉnh:
 * lĩnh vực, tiêu đề, tác giả, tóm tắt, nội dung, hình ảnh kèm chú thích, tài liệu tham khảo, khai báo xung đột lợi ích.
 * Dùng ở: routes/ResearchEditor.jsx khi bài đã nộp (không sửa được nữa). CSS: assets/styles/research.css.
 *
 * Props: article (ResearchArticleView từ backend), author ({ fullName, avatarUrl } - người đang đăng nhập)
 */
function ResearchReader({ article, author }) {
  // Tài liệu tham khảo: mỗi dòng 1 nguồn -> danh sách đánh số
  const references = (article.references ?? '').split('\n').map((line) => line.trim()).filter(Boolean)

  return (
    <article className="paper paper--reader">
      <div className="paper__kicker">Bài nghiên cứu · {article.field}</div>
      <h1 className="paper__heading">{article.title}</h1>
      <div className="paper__byline">
        <Avatar name={author?.fullName} src={author?.avatarUrl} size={34} />
        <span>
          <strong>{author?.fullName}</strong>
          <small>Nộp lúc {formatDateTime(article.submittedAt)} · {article.wordCount} chữ</small>
        </span>
      </div>

      <section className="paper__abstract">
        <h2>Tóm tắt</h2>
        <p>{article.abstractText}</p>
        {article.keywords && (
          <p className="paper__keywords">
            <b>Từ khoá:</b> {article.keywords}
          </p>
        )}
      </section>

      <ArticleBody content={article.content} />

      {article.images.length > 0 && (
        <section className="paper__section">
          <h2>Hình ảnh minh hoạ</h2>
          <div className="reader-figures">
            {article.images.map((image, index) => (
              <figure key={image.url}>
                <a href={image.url} target="_blank" rel="noreferrer">
                  <img src={image.url} alt={image.caption || `Hình ${index + 1}`} />
                </a>
                <figcaption>
                  <b>Hình {index + 1}.</b> {image.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="paper__section">
        <h2>Tài liệu tham khảo</h2>
        <ol className="paper__references">
          {references.map((reference) => (
            <li key={reference}>{reference}</li>
          ))}
        </ol>
      </section>

      <p className="paper__conflict">
        <b>Xung đột lợi ích:</b> {article.hasConflict ? article.conflictNote : 'Tác giả cam kết không có xung đột lợi ích.'}
      </p>
    </article>
  )
}

export default ResearchReader
