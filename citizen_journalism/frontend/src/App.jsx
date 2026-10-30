import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/admin/AdminLayout.jsx'
import EditorLayout from './components/editor/EditorLayout.jsx'
import ProtectedRoute from './components/layout/ProtectedRoute.jsx'
import ScrollToTop from './components/layout/ScrollToTop.jsx'
import { AuthProvider } from './context/AuthProvider.jsx'
import ChangePassword from './routes/ChangePassword.jsx'
import ForgotPassword from './routes/ForgotPassword.jsx'
import Homepage from './routes/Homepage.jsx'
import Login from './routes/Login.jsx'
import MySubmissionDetail from './routes/MySubmissionDetail.jsx'
import MySubmissions from './routes/MySubmissions.jsx'
import NotFound from './routes/NotFound.jsx'
import Profile from './routes/Profile.jsx'
import Register from './routes/Register.jsx'
import ExpertRevisionReview from './routes/ExpertRevisionReview.jsx'
import ResearchEditor from './routes/ResearchEditor.jsx'
import ResearchList from './routes/ResearchList.jsx'
import SubmitReport from './routes/SubmitReport.jsx'
import SupplementSubmission from './routes/SupplementSubmission.jsx'
import TrackSubmission from './routes/TrackSubmission.jsx'
import VerifyOtp from './routes/VerifyOtp.jsx'
import { SUBMITTER_ROLES } from './lib/roles.js'
import AdminOverview from './routes/admin/AdminOverview.jsx'
import AdminUserDetail from './routes/admin/AdminUserDetail.jsx'
import AdminUsers from './routes/admin/AdminUsers.jsx'
import EditorApplicationDetail from './routes/editor/EditorApplicationDetail.jsx'
import EditorArticles from './routes/editor/EditorArticles.jsx'
import EditorApplications from './routes/editor/EditorApplications.jsx'
import EditorDuplicateCheck from './routes/editor/EditorDuplicateCheck.jsx'
import EditorOverview from './routes/editor/EditorOverview.jsx'
import EditorAssignContributor from './routes/editor/EditorAssignContributor.jsx'
import EditorAssignments from './routes/editor/EditorAssignments.jsx'
import EditorPlanned from './routes/editor/EditorPlanned.jsx'
import EditorQueue from './routes/editor/EditorQueue.jsx'
import EditorResearchDetail from './routes/editor/EditorResearchDetail.jsx'
import EditorSubmissionDetail from './routes/editor/EditorSubmissionDetail.jsx'

/**
 * Component gốc của ứng dụng: khai báo BẢN ĐỒ ĐƯỜNG DẪN (routing).
 * Mỗi <Route path="..."> ứng với một trang trong thư mục src/routes/.
 *
 * - BrowserRouter (React Router): cho phép đổi trang mà không tải lại toàn bộ web.
 * - AuthProvider: cung cấp thông tin đăng nhập cho MỌI trang (dùng qua hook useAuth()).
 * - ProtectedRoute: bọc các trang BẮT BUỘC đăng nhập (chưa đăng nhập -> chuyển sang /login).
 * Thêm trang mới: tạo file trong src/routes/ rồi thêm 1 dòng <Route> ở đây.
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          {/* ----- Trang công khai ----- */}
          <Route path="/" element={<Homepage />} />
          <Route path="/login" element={<Login />} />                     {/* Đăng nhập */}
          <Route path="/register" element={<Register />} />               {/* Đăng ký tài khoản */}
          <Route path="/verify-otp" element={<VerifyOtp />} />            {/* Nhập mã OTP sau khi đăng ký */}
          <Route path="/forgot-password" element={<ForgotPassword />} />  {/* Quên mật khẩu */}
          <Route path="/track" element={<TrackSubmission />} />          {/* Tra cứu hồ sơ bằng mã + PIN */}

          {/* ----- Trang cần đăng nhập ----- */}
          <Route
            path="/account/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/change-password"
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />
          {/* Gửi thông tin (tin nóng, khiếu nại...): chỉ người dân, cộng tác viên, chuyên gia. Loại được chọn tuỳ vai trò */}
          <Route
            path="/submit"
            element={
              <ProtectedRoute roles={SUBMITTER_ROLES}>
                <SubmitReport />
              </ProtectedRoute>
            }
          />
          {/* Bài nghiên cứu (chỉ Chuyên gia): danh sách bản nháp / bài đã nộp, trình soạn bài mới, mở lại 1 bài */}
          <Route
            path="/research"
            element={
              <ProtectedRoute roles={['EXPERT']}>
                <ResearchList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/research/new"
            element={
              <ProtectedRoute roles={['EXPERT']}>
                <ResearchEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/research/:id"
            element={
              <ProtectedRoute roles={['EXPERT']}>
                <ResearchEditor />
              </ProtectedRoute>
            }
          />
          {/* Chuyên gia xem / trao đổi / đồng ý / từ chối 1 yêu cầu chỉnh sửa của Biên tập viên */}
          <Route
            path="/research/revisions/:id"
            element={
              <ProtectedRoute roles={['EXPERT']}>
                <ExpertRevisionReview />
              </ProtectedRoute>
            }
          />
          {/* Thông tin đã gửi (danh sách) và theo dõi từng hồ sơ: chỉ người gửi xem được hồ sơ của mình */}
          <Route
            path="/account/submissions"
            element={
              <ProtectedRoute roles={SUBMITTER_ROLES}>
                <MySubmissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account/submissions/:code"
            element={
              <ProtectedRoute roles={SUBMITTER_ROLES}>
                <MySubmissionDetail />
              </ProtectedRoute>
            }
          />
          {/* Bổ sung thông tin khi toà soạn đề nghị (hồ sơ "Cần bổ sung"): form khác nhau cho Người dân / Chuyên gia */}
          <Route
            path="/account/submissions/:code/supplement"
            element={
              <ProtectedRoute roles={SUBMITTER_ROLES}>
                <SupplementSubmission />
              </ProtectedRoute>
            }
          />

          {/* ----- Khu quản trị: chỉ SYSTEM_ADMIN. Route LỒNG NHAU: AdminLayout là khung chung,
                   các trang con hiện vào chỗ <Outlet /> của khung. index = trang mặc định của /admin ----- */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['SYSTEM_ADMIN']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminOverview />} />           {/* /admin       : Tổng quan */}
            <Route path="users" element={<AdminUsers />} />       {/* /admin/users : Quản lý tài khoản */}
            <Route path="users/:id" element={<AdminUserDetail />} /> {/* /admin/users/CT0001 : Xem / sửa một tài khoản */}
          </Route>

          {/* ----- Bàn làm việc Biên tập viên: chỉ EDITOR. Cũng là route lồng nhau trong EditorLayout ----- */}
          <Route
            path="/editor"
            element={
              <ProtectedRoute roles={['EDITOR']}>
                <EditorLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<EditorOverview />} />                                {/* Tổng quan */}
            <Route path="queue" element={<EditorQueue />} />                            {/* Hàng đợi tin bài */}
            <Route path="queue/:code" element={<EditorSubmissionDetail />} />           {/* Chi tiết 1 hồ sơ */}
            <Route path="queue/:code/assign" element={<EditorAssignContributor />} />  {/* Chọn CTV giao nhiệm vụ */}
            <Route path="queue/research/:id" element={<EditorResearchDetail />} />     {/* Chi tiết 1 bài nghiên cứu */}
            <Route path="applications" element={<EditorApplications />} />              {/* Đơn đăng ký CTV */}
            <Route path="applications/:id" element={<EditorApplicationDetail />} />     {/* Xét 1 đơn */}
            <Route path="screening/:code" element={<EditorDuplicateCheck />} />         {/* Kiểm tra tin trùng của 1 hồ sơ */}
            {/* Các mục "Sắp có": cùng 1 trang giới thiệu, khác nội dung theo prop page */}
            <Route path="screening" element={<EditorPlanned page="screening" />} />
            <Route path="assignments" element={<EditorAssignments />} />                 {/* Nhiệm vụ đã giao */}
            <Route path="articles" element={<EditorArticles />} />                       {/* Biên tập bài viết */}
            <Route path="members" element={<EditorPlanned page="members" />} />
          </Route>

          {/* "*" = mọi đường dẫn không khớp ở trên (gõ sai link, hoặc trang chưa làm) */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
