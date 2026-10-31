import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/admin/AdminLayout.jsx'
import EditorLayout from './components/editor/EditorLayout.jsx'
import ProtectedRoute from './components/layout/ProtectedRoute.jsx'
import RoleHomeRedirect from './components/layout/RoleHomeRedirect.jsx'
import ScrollToTop from './components/layout/ScrollToTop.jsx'
import { AuthProvider } from './context/AuthProvider.jsx'
import ChangePassword from './routes/ChangePassword.jsx'
import ForgotPassword from './routes/ForgotPassword.jsx'
import Homepage from './routes/Homepage.jsx'
import Login from './routes/Login.jsx'
import MySubmissionDetail from './routes/MySubmissionDetail.jsx'
import MySubmissions from './routes/MySubmissions.jsx'
import Profile from './routes/Profile.jsx'
import Register from './routes/Register.jsx'
import ExpertRevisionReview from './routes/ExpertRevisionReview.jsx'
import ResearchEditor from './routes/ResearchEditor.jsx'
import ResearchList from './routes/ResearchList.jsx'
import SubmitReport from './routes/SubmitReport.jsx'
import SubmissionHistory from './routes/SubmissionHistory.jsx'
import SupplementSubmission from './routes/SupplementSubmission.jsx'
import TrackSubmission from './routes/TrackSubmission.jsx'
import VerifyOtp from './routes/VerifyOtp.jsx'
import { SUBMITTER_ROLES } from './lib/roles.js'
import AdminOverview from './routes/admin/AdminOverview.jsx'
import AdminUserDetail from './routes/admin/AdminUserDetail.jsx'
import AdminUsers from './routes/admin/AdminUsers.jsx'
import AuditLogs from './routes/admin/AuditLogs'
import EditorApplicationDetail from './routes/editor/EditorApplicationDetail.jsx'
import LeadershipApprovals from './routes/leadership/LeadershipApprovals.jsx'
import LeadershipAppealDetail from './routes/leadership/LeadershipAppealDetail.jsx'
import LeadershipLayout from './components/leadership/LeadershipLayout.jsx'
import AccountAppeal from './routes/AccountAppeal.jsx'
import EditorAppeals from './routes/editor/EditorAppeals.jsx'
import EditorAppealDetail from './routes/editor/EditorAppealDetail.jsx'
import EditorArticles from './routes/editor/EditorArticles.jsx'
import EditorApplications from './routes/editor/EditorApplications.jsx'
import EditorCategories from './routes/editor/EditorCategories.jsx'
import EditorDuplicateCheck from './routes/editor/EditorDuplicateCheck.jsx'
import EditorOverview from './routes/editor/EditorOverview.jsx'
import ContributorTaskDetail from './routes/contributor/ContributorTaskDetail.jsx'
import ContributorTaskReport from './routes/contributor/ContributorTaskReport.jsx'
import ContributorTaskRevision from './routes/contributor/ContributorTaskRevision.jsx'
import ContributorTasks from './routes/contributor/ContributorTasks.jsx'
import EditorAssignContributor from './routes/editor/EditorAssignContributor.jsx'
import EditorAssignments from './routes/editor/EditorAssignments.jsx'
import EditorPlanned from './routes/editor/EditorPlanned.jsx'
import ViolationReports, { ViolationReportDetail } from './routes/editor/ViolationReports.jsx'
import LeadershipContent, { LeadershipContentDetail } from './routes/leadership/LeadershipContent.jsx'
import UserPerformance from './routes/editor/UserPerformance.jsx'
import ExpertApplications from './routes/editor/ExpertApplications.jsx'
import LeadershipApplications from './routes/leadership/LeadershipApplications.jsx'
import EditorQueue from './routes/editor/EditorQueue.jsx'
import EditorRejectSubmission from './routes/editor/EditorRejectSubmission.jsx'
import EditorRequestInfo from './routes/editor/EditorRequestInfo.jsx'
import EditorResearchDetail from './routes/editor/EditorResearchDetail.jsx'
import EditorSubmissionDetail from './routes/editor/EditorSubmissionDetail.jsx'
import EditorReputationResearchDetail from './routes/editor/EditorReputationResearchDetail.jsx'
import EditorReputation from './routes/editor/EditorReputation.jsx'
import EditorReputationAccount from './routes/editor/EditorReputationAccount.jsx'
import EditorVerificationReview from './routes/editor/EditorVerificationReview.jsx'
import Notifications from './routes/Notifications.jsx'

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
          <Route path="/account-appeal" element={<AccountAppeal />} />

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
  path="/account/notifications"
  element={
    <ProtectedRoute>
      <Notifications />
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
          {/* Nhiệm vụ xác minh hiện trường (chỉ Cộng tác viên): danh sách và chi tiết 1 nhiệm vụ */}
          <Route
            path="/contributor/tasks"
            element={
              <ProtectedRoute roles={['CONTRIBUTOR']}>
                <ContributorTasks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contributor/tasks/:id"
            element={
              <ProtectedRoute roles={['CONTRIBUTOR']}>
                <ContributorTaskDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contributor/tasks/:id/report"
            element={
              <ProtectedRoute roles={['CONTRIBUTOR']}>
                <ContributorTaskReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contributor/tasks/:id/revise"
            element={
              <ProtectedRoute roles={['CONTRIBUTOR']}>
                <ContributorTaskRevision />
              </ProtectedRoute>
            }
          />
          {/* Lịch sử chỉnh sửa: các phiên bản của hồ sơ qua từng lần bổ sung, so sánh 2 phiên bản */}
          <Route
            path="/account/submissions/:code/history"
            element={
              <ProtectedRoute roles={SUBMITTER_ROLES}>
                <SubmissionHistory />
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
            <Route path="audit-history" element={<AuditLogs />} />
            <Route path="users/:id" element={<AdminUserDetail />} /> {/* /admin/users/CT0001 : Xem / sửa một tài khoản */}
          </Route>

          <Route
            path="/leadership"
            element={
              <ProtectedRoute roles={['DEPUTY_EIC', 'EIC']}>
                <LeadershipLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<LeadershipContent />} />
            <Route path="appeals" element={<ProtectedRoute roles={['DEPUTY_EIC']}><LeadershipApprovals /></ProtectedRoute>} />
            <Route path="violations" element={<ProtectedRoute roles={['DEPUTY_EIC']}><ViolationReports leadership /></ProtectedRoute>} />
            <Route path="content" element={<LeadershipContent />} />
            <Route path="applications" element={<ProtectedRoute roles={['DEPUTY_EIC']}><LeadershipApplications /></ProtectedRoute>} />
            <Route path="content/:kind/:id" element={<LeadershipContentDetail />} />
            <Route path="violations/:id" element={<ProtectedRoute roles={['DEPUTY_EIC']}><ViolationReportDetail leadership /></ProtectedRoute>} />
            <Route path="approvals/appeals/:id" element={<ProtectedRoute roles={['DEPUTY_EIC']}><LeadershipAppealDetail /></ProtectedRoute>} />
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
            <Route path="reputation" element={<EditorReputation />} />
            <Route path="reputation/accounts/:accountId" element={<EditorReputationAccount />} />
            <Route path="reputation/accounts/:accountId/submissions/:code" element={<EditorSubmissionDetail reputationMode />} />
            <Route path="reputation/accounts/:accountId/research/:id" element={<EditorReputationResearchDetail />} />
            <Route path="applications" element={<EditorApplications />} />              {/* Đơn đăng ký CTV */}
            <Route path="applications/:id" element={<EditorApplicationDetail />} />     {/* Xét 1 đơn */}
            <Route path="appeals" element={<EditorAppeals />} />
            <Route path="appeals/:id" element={<EditorAppealDetail />} />
            <Route path="queue/:code/assign" element={<EditorAssignContributor />} />  {/* Chọn CTV giao nhiệm vụ */}
            <Route path="queue/:code/reject" element={<EditorRejectSubmission />} />    {/* Từ chối 1 hồ sơ */}
            <Route path="queue/:code/request-info" element={<EditorRequestInfo />} /> {/* Yêu cầu bổ sung cho 1 hồ sơ */}
            <Route path="queue/:code/verification" element={<EditorVerificationReview />} /> {/* Duyệt kết quả xác minh của CTV */}
            <Route path="queue/research/:id" element={<EditorResearchDetail />} />     {/* Chi tiết 1 bài nghiên cứu */}
            <Route path="categories" element={<EditorCategories />} />
            <Route path="screening/:code" element={<EditorDuplicateCheck />} />         {/* Kiểm tra tin trùng của 1 hồ sơ */}
            {/* Các mục "Sắp có": cùng 1 trang giới thiệu, khác nội dung theo prop page */}
            <Route path="screening" element={<EditorPlanned page="screening" />} />
            <Route path="assignments" element={<EditorAssignments />} />                 {/* Nhiệm vụ đã giao */}
            <Route path="articles" element={<EditorArticles />} />                       {/* Biên tập bài viết */}
            <Route path="members" element={<ViolationReports />} />
            <Route path="performance" element={<UserPerformance />} />
            <Route path="expert-applications" element={<ExpertApplications />} />
            <Route path="violations" element={<ViolationReports />} />
            <Route path="violations/:id" element={<ViolationReportDetail />} />
          </Route>

          {/* "*" = mọi đường dẫn không khớp ở trên (gõ sai link...): về trang chính theo vai trò */}
          <Route path="*" element={<RoleHomeRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
