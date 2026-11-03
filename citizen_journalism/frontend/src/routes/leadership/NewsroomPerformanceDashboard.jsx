
import { useState } from 'react'
import { useAsyncData } from '../../hooks/useAsyncData'
import { deputyNewsroomInsightsService } from '../../services/deputyNewsroomInsightsService'
import '../../assets/styles/deputy-newsroom-insights.css'

// TungTT - Iteration 3 - Task 4

const PERIODS = [
  { value: 'DAY', label: 'Hôm nay' },
  { value: 'WEEK', label: 'Tuần này' },
  { value: 'MONTH', label: 'Tháng này' },
]

function Metric({ label, value, icon, tone, description }) {
  return (
    <article className="dni-metric">
      <div className={`dni-metric__icon dni-tone--${tone}`}>
        {icon}
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{description}</small>
    </article>
  )
}

export default function NewsroomPerformanceDashboard() {
  const [period, setPeriod] = useState('WEEK')

  const { data, error, loading, reload } = useAsyncData(
    () => deputyNewsroomInsightsService.dashboard(period),
    `newsroom-performance-${period}`
  )

  const number = (value) =>
    value == null ? '—' : value.toLocaleString('vi-VN')

  const approved = data?.approvedDecisions ?? 0
  const rejected = data?.rejectedDecisions ?? 0
  const decisions = approved + rejected

  const approvalRate = decisions
    ? Math.round((approved / decisions) * 100)
    : null

  return (
    <div className="dni-page">
      <header className="dni-hero">
        <div>
          <span className="dni-eyebrow">
            NEWSROOM ANALYTICS
          </span>
          <h1>Hiệu suất tòa soạn</h1>
          <p>
            Theo dõi lượng hồ sơ, bài nghiên cứu và
            các quyết định xét duyệt.
          </p>
        </div>
        <span className="dni-hero__symbol">01</span>
      </header>

      <section className="dni-panel">
        <div className="dni-toolbar">
          <div>
            <h2>Thống kê hoạt động</h2>
            <p>
              {data
                ? `Từ ${data.from} đến ${data.to}`
                : 'Chọn khoảng thời gian thống kê'}
            </p>
          </div>

          <div className="dni-toolbar__actions">
            <div className="dni-tabs">
              {PERIODS.map(item => (
                <button
                  key={item.value}
                  type="button"
                  className={
                    period === item.value ? 'dni-tab--active' : ''
                  }
                  onClick={() => setPeriod(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="dni-button"
              onClick={reload}
              disabled={loading}
            >
              Làm mới
            </button>
          </div>
        </div>

        {error && (
          <div className="dni-error" role="alert">
            {error}
          </div>
        )}

        <div className="dni-metrics">
          <Metric
            label="Tổng nội dung tiếp nhận"
            value={loading ? '…' : number(data?.totalContent)}
            icon="▤"
            tone="blue"
            description="Hồ sơ/tin và bài nghiên cứu"
          />
          <Metric
            label="Hồ sơ và tin mới"
            value={loading ? '…' : number(data?.submissions)}
            icon="◫"
            tone="purple"
            description="Không tính bài CTV gắn nhiệm vụ"
          />
          <Metric
            label="Bài nghiên cứu đã nộp"
            value={loading ? '…' : number(data?.researchArticles)}
            icon="▣"
            tone="cyan"
            description="Theo thời điểm nộp"
          />
          <Metric
            label="Quyết định phê duyệt"
            value={loading ? '…' : number(data?.approvedDecisions)}
            icon="✓"
            tone="green"
            description="Lượt APPROVE trong kỳ"
          />
          <Metric
            label="Quyết định từ chối"
            value={loading ? '…' : number(data?.rejectedDecisions)}
            icon="×"
            tone="red"
            description="Lượt REJECT trong kỳ"
          />
        </div>
      </section>

      <section className="dni-panel dni-analysis">
        <div className="dni-section-heading">
          <div>
            <h2>Tỷ lệ quyết định xét duyệt</h2>
            <p>So sánh số lượt phê duyệt và từ chối.</p>
          </div>
          <strong className="dni-analysis__rate">
            {loading || !data || approvalRate === null
              ? '—'
              : `${approvalRate}%`}
          </strong>
        </div>

        {data && decisions > 0 ? (
          <>
            <div
              className="dni-progress"
              aria-label={`Phê duyệt ${approvalRate}%`}
            >
              <span
                className="dni-progress__approved"
                style={{ width: `${approvalRate}%` }}
              />
            </div>

            <div className="dni-legend">
              <span>
                <i className="dni-dot dni-dot--green" />
                Phê duyệt: {number(approved)}
              </span>
              <span>
                <i className="dni-dot dni-dot--red" />
                Từ chối: {number(rejected)}
              </span>
            </div>
          </>
        ) : (
          <p className="dni-empty">
            {loading
              ? 'Đang tải dữ liệu...'
              : 'Chưa có quyết định xét duyệt trong kỳ này.'}
          </p>
        )}
      </section>

      <p className="dni-footnote">
        Số quyết định được tính từ lịch sử editorial_reviews;
        một nội dung có thể được xét duyệt nhiều lần.
        Dashboard không bao gồm đơn nâng cấp CTV/Expert.
      </p>
    </div>
  )
}
