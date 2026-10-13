import { Link, useParams } from 'react-router-dom'
import SubmissionDetail from '../../components/submission/SubmissionDetail'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { useAsyncData } from '../../hooks/useAsyncData'
import { editorService } from '../../services/editorService'

/*
 * CHI TIẾT 1 HỒ SƠ TRONG HÀNG ĐỢI — /editor/queue/:code (Biên tập viên).
 * Dữ liệu: GET /api/editor/submissions/{mã}; hiển thị bằng SubmissionDetail (dùng chung với trang người dân theo dõi).
 *
 * Thanh thao tác phía trên đã ĐẶT SẴN các nút theo use case của Editor trong SRS (tiếp nhận thẩm định,
 * yêu cầu bổ sung, giao CTV xác minh, từ chối) nhưng đang KHOÁ: backend xử lý tin sẽ làm ở bản sau.
 */

const PLANNED_ACTIONS = [
  { icon: 'checkCircle', label: 'Tiếp nhận thẩm định' },
  { icon: 'info', label: 'Yêu cầu bổ sung' },
  { icon: 'mapPin', label: 'Giao CTV xác minh' },
  { icon: 'x', label: 'Từ chối', danger: true },
]

function EditorSubmissionDetail() {
  const { code } = useParams()
  const { data, error } = useAsyncData(() => editorService.getSubmission(code), code)

  return (
    <div className="desk-detail">
      <Link to="/editor/queue" className="desk-back">
        <Icon name="arrowLeft" size={16} />
        Hàng đợi tin bài
      </Link>

      {error && <Alert type="error">{error}</Alert>}
      {!data && !error && <div className="skeleton skeleton--page" />}

      {data && (
        <>
          <section className="admin-panel desk-actions">
            <div>
              <strong>Xử lý hồ sơ</strong>
              <small>Các thao tác xử lý tin sẽ có ở bản sau.</small>
            </div>
            <div className="desk-actions__buttons">
              {PLANNED_ACTIONS.map((action) => (
                <Button
                  key={action.label}
                  variant={action.danger ? 'danger' : 'secondary'}
                  className="btn--sm"
                  disabled
                  title="Sắp có"
                >
                  <Icon name={action.icon} size={14} />
                  {action.label}
                </Button>
              ))}
            </div>
          </section>
          <SubmissionDetail detail={data} />
        </>
      )}
    </div>
  )
}

export default EditorSubmissionDetail
