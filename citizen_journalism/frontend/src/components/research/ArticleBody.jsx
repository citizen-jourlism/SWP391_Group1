/**
 * HIỂN THỊ NỘI DUNG BÀI NGHIÊN CỨU từ chữ thường, với vài quy ước định dạng đơn giản (gõ trong ô soạn thảo):
 *   - Dòng trống           : ngắt đoạn (xuống dòng đơn vẫn giữ trong cùng đoạn)
 *   - "## Tiêu đề mục"     : tiêu đề mục lớn      - "### Tiêu đề nhỏ" : tiêu đề mục nhỏ
 *   - "- nội dung"         : gạch đầu dòng (các dòng liền nhau gộp thành 1 danh sách)
 *   - "**chữ đậm**"        : in đậm
 * Dùng ở: ResearchEditor (tab "Xem trước") và chế độ xem bài đã nộp. CSS: assets/styles/research.css (.article-body).
 *
 * TẠI SAO tự viết mà không dùng dangerouslySetInnerHTML? Nội dung do người dùng gõ; nếu đổ thẳng ra HTML thì ai đó có thể
 * chèn mã độc (<script>...). Ở đây mọi thứ được dựng bằng thẻ React, chữ luôn được hiển thị như chữ, không chạy được.
 */

/** "Có **chữ đậm** ở đây" -> ["Có ", <strong>chữ đậm</strong>, " ở đây"] */
function renderInline(text) {
  // split với nhóm bắt (...) giữ lại phần khớp: các phần ở vị trí lẻ là chữ cần in đậm
  return text.split(/\*\*(.+?)\*\*/g).map((part, index) => (index % 2 === 1 ? <strong key={index}>{part}</strong> : part))
}

/**
 * Đọc nội dung TỪNG DÒNG và gom thành các khối: { type: 'h3' | 'h4' | 'p' | 'ul', text | items }.
 *   - Dòng tiêu đề (## / ###) luôn là 1 khối riêng, kể cả khi không có dòng trống trước / sau.
 *   - Các dòng "- " liền nhau gom thành 1 danh sách; các dòng chữ thường liền nhau gom thành 1 đoạn.
 *   - Dòng trống kết thúc đoạn / danh sách đang gom.
 */
function toBlocks(content) {
  const blocks = []
  let paragraph = []
  let list = []
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'p', text: paragraph.join('\n') })
    paragraph = []
  }
  const flushList = () => {
    if (list.length) blocks.push({ type: 'ul', items: list })
    list = []
  }

  for (const rawLine of content.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      flushList()
    } else if (line.startsWith('### ') || line.startsWith('## ')) {
      flushParagraph()
      flushList()
      blocks.push(line.startsWith('### ') ? { type: 'h4', text: line.slice(4) } : { type: 'h3', text: line.slice(3) })
    } else if (line.startsWith('- ')) {
      flushParagraph()
      list.push(line.slice(2))
    } else {
      flushList()
      paragraph.push(line)
    }
  }
  flushParagraph()
  flushList()
  return blocks
}

function ArticleBody({ content }) {
  if (!content?.trim()) {
    return <p className="article-body__empty">Chưa có nội dung.</p>
  }

  return (
    <div className="article-body">
      {toBlocks(content).map((block, index) => {
        if (block.type === 'h3') return <h3 key={index}>{renderInline(block.text)}</h3>
        if (block.type === 'h4') return <h4 key={index}>{renderInline(block.text)}</h4>
        if (block.type === 'ul') {
          return (
            <ul key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ul>
          )
        }
        // Đoạn văn: xuống dòng đơn trong đoạn giữ nguyên (CSS white-space: pre-line)
        return <p key={index}>{renderInline(block.text)}</p>
      })}
    </div>
  )
}

export default ArticleBody
