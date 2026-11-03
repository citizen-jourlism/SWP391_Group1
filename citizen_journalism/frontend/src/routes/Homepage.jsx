import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SiteHeader from '../components/layout/SiteHeader'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import '../assets/styles/homepage.css'

// Thang điểm tác động (Impact Score): điểm = A + B + C, từ 15 đến 100. Giữ khớp với ngưỡng ở backend.
const scoreCards = [
	{
		title: 'Khu Vực Ảnh Hưởng (Location Scope)',
		details: [['Một hộ / một điểm', '5 điểm'], ['Một phường / xã', '10 điểm'], ['Nhiều xã / quận, huyện', '20 điểm'], ['Toàn tỉnh hoặc liên tỉnh', '30 điểm']],
	},
	{
		title: 'Số Người Bị Ảnh Hưởng (Affected Population)',
		details: [['Dưới 10 người', '5 điểm'], ['10 - 100 người', '10 điểm'], ['101 - 1.000 người', '20 điểm'], ['Trên 1.000 người', '30 điểm']],
	},
	{
		title: 'Tính Chất Vấn Đề (Severity & Nature)',
		details: [['Phiền toái, dịch vụ công', '5 điểm'], ['Quyền lợi, tài sản, kinh tế', '15 điểm'], ['Sức khỏe, môi trường, an toàn', '25 điểm'], ['Đe dọa tính mạng, thảm họa', '40 điểm']],
	},
]

// Đe dọa tính mạng hoặc nội dung nhạy cảm: tối thiểu mức HIGH. HIGH / BREAKING do Tổng biên tập duyệt.
const impactLevels = [
	['Mức 1: LOW (15 - 39)', 'Ảnh hưởng nhỏ, cục bộ; xử lý theo thứ tự thông thường.'],
	['Mức 2: MEDIUM (40 - 59)', 'Ảnh hưởng một cộng đồng; cần xử lý trong ngày.'],
	['Mức 3: HIGH (60 - 79)', 'Ảnh hưởng rộng hoặc nguy hiểm; cần Tổng biên tập duyệt.'],
	['Mức 4: BREAKING (80 - 100)', 'Rất nghiêm trọng, quy mô lớn, đang diễn ra; ưu tiên cao nhất.'],
]

const features = [
	['📡', 'Báo Về Nguyên Tín Tuyệt Đối', 'Máy ảnh, tin đã được xác thực và minh bạch theo quy trình chuyên môn.'],
	['🧭', 'Mạng Lưới Tác Nghiệp Rộng Khắp', 'Đội ngũ dân sự và phóng viên cộng đồng phủ rộng cơ sở xã, huyện.'],
	['🛡️', 'Thang Điểm Impact Score', 'Đánh giá chuyên sâu theo quy chuẩn tác động để ưu tiên xử lý.'],
	['📍', 'Đồng Hành Xử Lý Cùng', 'Phối hợp các cơ quan, báo chí và cộng đồng để giải quyết hiệu quả.'],
]

const missions = [
	['📚', 'Bản Tin Số & Tin Nóng Khẩn Cấp', 'Cập nhật thường xuyên thông tin nóng, chính xác và kịp thời.'],
	['🧾', 'Trung Tâm Điều Phối Phản Ánh Trực Tiếp', 'Hỗ trợ dân phản ánh, tiếp nhận và chuẩn hóa thông tin cần khẩn.'],
	['🗂️', 'Hội Đồng Thẩm Định Pháp Lý & Trực Ban', 'Phân tích pháp lý, pháp luật và giải pháp ứng phó phù hợp.'],
	['📣', 'Bản Tin Đặc Biệt & Tin Tức Hệ Thống', 'Đưa tin ngắn gọn, dễ hiểu về các sự việc cộng đồng lớn.'],
]

function Homepage() {
	useDocumentTitle() // Không truyền tên -> tiêu đề tab chỉ là "Tin Nóng Dân Sinh" (tránh giữ tên của trang trước)
	const navigate = useNavigate()
	const [trackingCode, setTrackingCode] = useState('')

	/** Ô tra cứu nhanh: chuyển sang trang Tra cứu (/track) với mã đã điền sẵn, ở đó nhập tiếp mã PIN. */
	const goToTracking = (event) => {
		event.preventDefault()
		const code = trackingCode.trim()
		navigate(code ? `/track?code=${encodeURIComponent(code)}` : '/track')
	}

	return (
		<div className="page-shell">
			{/* Thanh đầu trang dùng chung: tự đổi nút theo trạng thái đăng nhập (xem components/layout/SiteHeader.jsx) */}
			<SiteHeader />

			<main className="container page-content">
				<section className="hero-panel">
					<div className="hero-badge">KÊNH TIẾP NHẬN &amp; PHẢN HỒI CHÍNH THỨC CỦA TÒA SOẠN</div>
					<h1>CỔNG TIẾP NHẬN &amp; XÁC THỰC<br /><span>TIN NÓNG DÂN SINH 24/7</span></h1>
					<p>
						Mỗi người dân là một &quot;mắt tốt&quot; của cộng đồng. Khi phát hiện sự cố, tai nạn,
						hải quan, hay lộ thông tin sai lệch, hãy đồng hành và gửi thông tin cho đội ngũ
						kiểm định để giúp cộng đồng được biết và giải quyết kịp thời.
					</p>
					{/* Chưa đăng nhập thì /submit tự chuyển sang trang Đăng nhập, đăng nhập xong quay lại đúng form.
					    Một nút gửi chung: chọn Tin nóng hay Khiếu nại... ngay trong form. */}
					<div className="hero-actions">
						<Link className="primary-btn" to="/submit">Gửi thông tin</Link>
						<Link className="secondary-btn" to="/track">Tra cứu hồ sơ</Link>
					</div>
					{/* Ô tra cứu nhanh: dùng thẻ <form> để nhấn Enter cũng tra cứu được */}
					<form className="report-box" onSubmit={goToTracking}>
						<input
							type="text"
							value={trackingCode}
							onChange={(event) => setTrackingCode(event.target.value)}
							placeholder="Nhập mã hồ sơ, ví dụ KB-2026-0001"
							aria-label="Mã hồ sơ"
							maxLength={20}
						/>
						<button type="submit">Tra cứu</button>
					</form>
					<div className="hero-stats">
						<div className="stat-item">
							<div className="stat-icon">⚑</div>
							<div><strong>6</strong><span>Số lượng tin nóng</span></div>
						</div>
						<div className="stat-item">
							<div className="stat-icon">📰</div>
							<div><strong>4</strong><span>Phòng ban xử lý</span></div>
						</div>
					</div>
				</section>

				<section className="score-section">
					<div className="section-head">
						<h2>QUY CHUẨN ĐÁNH GIÁ THANG ĐIỂM TÁC ĐỘNG (IMPACT SCORE 15 - 100 ĐIỂM)</h2>
						<a href="#">Xem tất cả</a>
					</div>
					<div className="score-grid">
						{scoreCards.map((card, index) => (
							<article className="score-card" key={card.title}>
								<div className="score-number">{index + 1}</div>
								<h3>{card.title}</h3>
								<ul>{card.details.map(([label, score]) => <li key={label}><span>{label}</span><span>{score}</span></li>)}</ul>
							</article>
						))}
					</div>
					<div className="level-grid">
						{impactLevels.map(([title, description]) => (
							<div className="level-card" key={title}>
								<div className="level-title">{title}</div>
								<p>{description}</p>
							</div>
						))}
					</div>
				</section>

				<section className="about-section" id="gioi-thieu">
					<div className="about-header">
						<div className="about-tag">Giới thiệu</div>
						<h2>GIỚI THIỆU VỀ TÒA SOẠN TIN NÓNG DÂN SINH</h2>
					</div>
					<div className="dark-panel">
						<div className="dark-panel-inner">
							<div className="panel-copy">
								<span className="label">TỜN CHÍ NHÁNH CHỐNG - TRUNG THỰC - KHÁCH QUAN - VÌ QUYỀN CỘNG ĐỒNG</span>
								<h3>TIÊN PHONG CHUYỂN ĐỔI SỐ BÁO CHÍ — TÁC NGHIỆP VÌ DÂN SINH</h3>
								<p>
									Bảo đồng tin tức ở Tòa soạn tin nóng dân sinh được thành lập với sứ mệnh phục vụ
									cộng đồng, tiết lộ thông tin nhanh chóng, kiểm chứng xác thực và lan tỏa những câu
									chuyện quan trọng về các vấn đề xã hội, môi trường, y tế và công quyền.
								</p>
								<div className="metrics-row">
									<div className="metric-box"><strong>63</strong><span>tin nóng</span></div>
									<div className="metric-box"><strong>500+</strong><span>người theo dõi</span></div>
									<div className="metric-box"><strong>24/7</strong><span>tiếp nhận</span></div>
									<div className="metric-box"><strong>30</strong><span>đội ngũ phản biện</span></div>
								</div>
							</div>
						</div>
					</div>
					<div className="feature-cards">
						{features.map(([icon, title, description]) => (
							<article className="feature-card" key={title}>
								<div className="feature-icon">{icon}</div>
								<h4>{title}</h4>
								<p>{description}</p>
							</article>
						))}
					</div>
				</section>

				<section className="mission-section">
					<div className="mission-head">
						<div className="mission-badge">CƠ QUAN NGHIỆP VỤ</div>
						<h2>CÁC BẢN CHUYỂN MÔN THỰC THUỘC TÒA SOẠN</h2>
						<button className="mini-link" type="button">Làm việc 24/7</button>
					</div>
					<div className="mission-grid">
						{missions.map(([icon, title, description]) => (
							<div className="mission-item" key={title}>
								<div className="mission-icon">{icon}</div>
								<h4>{title}</h4>
								<p>{description}</p>
							</div>
						))}
					</div>
				</section>
			</main>

			<footer className="site-footer" id="lien-he">
				<div className="container footer-top">
					<div>Đường dây trợ giúp: 1900 6668</div>
					<div>•</div>
					<div>Thời gian làm việc: 24/7</div>
				</div>
				<div className="container footer-main">
					<div className="footer-column brand-col">
						<h4>TIN NÓNG DÂN SINH</h4>
						<p>Tiếp nhận tin nóng, phản ánh, giúp cộng đồng hiểu rõ sự thật và cập nhật thông tin nhanh nhất.</p>
						<div className="footer-meta">© 2025</div>
					</div>
					<div className="footer-column">
						<h4>BAN LÃNH ĐẠO TÒA SOẠN</h4>
						<ul><li>Hà Thị Nguyên Long</li><li>Hồ Tùng Huy</li><li>Đặng Hòa Phương</li></ul>
					</div>
					<div className="footer-column">
						<h4>TRỤ SỞ &amp; VĂN PHÒNG ĐẠI DIỆN</h4>
						<ul><li>54 Lý Thường Kiệt</li><li>Quận 1, TP.HCM</li><li>info@tinnongdansinh.vn</li></ul>
					</div>
					<div className="footer-column">
						<h4>LIÊN HỆ</h4>
						<ul><li>hotline: 1900 6668</li><li>email: contact@... </li><li>facebook: tin nóng dân sinh</li></ul>
					</div>
				</div>
			</footer>
		</div>
	)
}

export default Homepage
