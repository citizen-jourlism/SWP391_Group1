import './homepage.css'

const navLinks = ['Trang chủ', 'Gửi phản ánh', 'Gửi khiếu nại', 'Về chúng tôi', 'Liên hệ']

const scoreCards = [
	{
		title: 'Khu Vực Xay Ra (Location Scope)',
		details: [['Phạm vi', '10 điểm'], ['Cập nhật', '20 điểm'], ['Độ phức tạp', '30 điểm'], ['Ảnh hưởng', '40 điểm']],
	},
	{
		title: 'Quy Mô Dân Số (Affected Population)',
		details: [['Cá nhân', '10 điểm'], ['Quy mô 11 - 100', '20 điểm'], ['Quy mô 101 - 1000', '30 điểm'], ['Quy mô 1001+', '40 điểm']],
	},
	{
		title: 'Loại Tình Chất (Severity & Nature)',
		details: [['Đánh giá', '10 điểm'], ['Sức khỏe', '20 điểm'], ['Khẩn cấp', '25 điểm'], ['Tác động môi trường', '35 điểm']],
	},
]

const impactLevels = [
	['Mức 1: LOW (30 - 50)', 'Ảnh hưởng nhỏ, cần theo dõi và can thiệp kịp thời.'],
	['Mức 2: MEDIUM (55 - 75)', 'Chú ý trung bình, cần xử lý trong thời gian ngắn.'],
	['Mức 3: HIGH (80 - 100)', 'Nguy hiểm và cần phối hợp nhiều đơn vị để giải quyết.'],
	['Mức 4: BREAKING (105 - 130)', 'Rất nghiêm trọng, có thể ảnh hưởng lớn đến cộng đồng.'],
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
	return (
		<div className="page-shell">
			<header className="topbar">
				<div className="topbar-inner container">
					<div className="topbar-left">
						<span className="dot red" />
						<span>Tiếp nhận phản ánh &amp; giải quyết tin tức</span>
					</div>
					<div className="topbar-right">
						<span>Hệ thống</span>
						<button className="login-button" type="button">Login</button>
					</div>
				</div>
			</header>

			<nav className="main-nav container" aria-label="Điều hướng chính">
				<div className="brand-block">
					<div className="brand-icon">✦</div>
					<div className="brand-text">
						<div className="brand-title">TIN NÓNG DÂN SINH</div>
						<div className="brand-sub">Tiếp nhận thông tin &amp; chăm sóc người dân</div>
					</div>
				</div>
				<div className="nav-links">
					{navLinks.map((label) => <a href="#" key={label}>{label}</a>)}
				</div>
			</nav>

			<main className="container page-content">
				<section className="hero-panel">
					<div className="hero-badge">KÊNH TIẾP NHẬN &amp; PHẢN HỒI CHÍNH THỨC CỦA TÒA SOẠN</div>
					<h1>CÔNG TIẾP NHẬN &amp; XÁC THỰC<br /><span>TIN NÓNG DÂN SINH 24/7</span></h1>
					<p>
						Mỗi người dân là một &quot;mắt tốt&quot; của cộng đồng. Khi phát hiện sự cố, tai nạn,
						hải quan, hay lộ thông tin sai lệch, hãy đồng hành và gửi thông tin cho đội ngũ
						kiểm định để giúp cộng đồng được biết và giải quyết kịp thời.
					</p>
					<div className="hero-actions">
						<button className="primary-btn" type="button">Bấm để gửi tin nóng</button>
						<button className="secondary-btn" type="button">Tra cứu tin</button>
					</div>
					<div className="report-box">
						<input type="text" placeholder="Nhập mã hồ sơ hoặc số điện thoại" aria-label="Mã hồ sơ hoặc số điện thoại" />
						<button type="button">Tra cứu</button>
					</div>
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
						<h2>QUY CHUẨN ĐÁNH GIÁ THANG ĐIỂM TÁC ĐỘNG (IMPACT SCORE 30 - 130 ĐIỂM)</h2>
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

				<section className="about-section">
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
						<button className="mini-link" type="button">Làm việc lên tới 24/7</button>
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
					<div className="cta-strip">
						<div className="cta-copy">CÂM KẾT &quot;4 KHÔNG” - 4 CỘT CỦA TÒA SOẠN TIN NÓNG DÂN SINH</div>
						<button type="button">Gửi Phản Ánh</button>
					</div>
				</section>
			</main>

			<footer className="site-footer">
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
