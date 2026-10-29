# Bản đồ code backend – Iter 1

Danh sách các chức năng Iter 1 và vị trí code backend tương ứng (file + dòng bắt đầu – kết thúc).

- Mọi file Java nằm trong `src/main/java/com/example/citizen_journalism/` (viết tắt bên dưới là `…/`).
- Số dòng tính từ annotation (`@PostMapping`…) tới dấu `}` cuối hàm, không tính đoạn comment `/** … */` phía trên.
- Số dòng đúng tại commit `60140aa`. Khi sửa code, số dòng có thể lệch, nhưng tên hàm vẫn tra được.
- Luồng chung của mỗi chức năng: **Controller** (nhận request) → **Service** (xử lý chính) → **Repository / Entity** (đọc / ghi database).

---

## 1. View home page

Không có backend riêng. Trang chủ chỉ là frontend: `frontend/src/routes/Homepage.jsx`.

## 2. Log In — `POST /api/auth/login`

| Tầng | Vị trí | Hàm | Làm gì |
|---|---|---|---|
| Controller | [`…/controller/AuthController.java` 87–90](../src/main/java/com/example/citizen_journalism/controller/AuthController.java#L87-L90) | `login` | Nhận tài khoản + mật khẩu |
| Controller | [`…/controller/AuthController.java` 97–100](../src/main/java/com/example/citizen_journalism/controller/AuthController.java#L97-L100) | `me` | Trả thông tin người đang đăng nhập |
| Service | [`…/service/AuthService.java` 137–172](../src/main/java/com/example/citizen_journalism/service/AuthService.java#L137-L172) | `login` | Kiểm tra mật khẩu, trạng thái tài khoản, cấp token |
| Service | [`…/service/AuthService.java` 244–249](../src/main/java/com/example/citizen_journalism/service/AuthService.java#L244-L249) | `findByIdentifier` | Tìm tài khoản theo email hoặc tên đăng nhập |
| Service | [`…/service/AuthService.java` 255–264](../src/main/java/com/example/citizen_journalism/service/AuthService.java#L255-L264) | `registerFailedLogin` | Đếm số lần sai, khoá tạm tài khoản |
| Security | [`…/security/JwtService.java` 43–61](../src/main/java/com/example/citizen_journalism/security/JwtService.java#L43-L61) | `issue` | Tạo JWT |
| Config | [`…/config/JwtConfig.java`](../src/main/java/com/example/citizen_journalism/config/JwtConfig.java) | | Cấu hình mã hoá / giải mã JWT |
| Config | [`…/config/SecurityConfig.java` 54–92](../src/main/java/com/example/citizen_journalism/config/SecurityConfig.java#L54-L92) | `filterChain` | Đường dẫn nào cần đăng nhập / vai trò gì |
| DTO | [`…/dto/auth/LoginRequest.java`](../src/main/java/com/example/citizen_journalism/dto/auth/LoginRequest.java), [`LoginResponse.java`](../src/main/java/com/example/citizen_journalism/dto/auth/LoginResponse.java) | | Dữ liệu vào / ra |

## 3. Register Account — `POST /api/auth/register`

| Tầng | Vị trí | Hàm | Làm gì |
|---|---|---|---|
| Controller | [`…/controller/AuthController.java` 57–61](../src/main/java/com/example/citizen_journalism/controller/AuthController.java#L57-L61) | `register` | Nhận form đăng ký |
| Service | [`…/service/AuthService.java` 71–99](../src/main/java/com/example/citizen_journalism/service/AuthService.java#L71-L99) | `register` | Kiểm tra trùng, tạo tài khoản chờ xác thực, gửi OTP |
| Util | [`…/util/UserIdGenerator.java` 28](../src/main/java/com/example/citizen_journalism/util/UserIdGenerator.java#L28) | `next` | Sinh mã người dùng (CT0001…) |
| Util | [`…/util/StrongPassword.java`](../src/main/java/com/example/citizen_journalism/util/StrongPassword.java) | | Kiểm tra mật khẩu mạnh |
| DTO | [`…/dto/auth/RegisterRequest.java`](../src/main/java/com/example/citizen_journalism/dto/auth/RegisterRequest.java) | | Dữ liệu form đăng ký |

## 4. Verify user authentic (OTP qua email)

| Tầng | Vị trí | Hàm | Làm gì |
|---|---|---|---|
| Controller | [`…/controller/AuthController.java` 67–71](../src/main/java/com/example/citizen_journalism/controller/AuthController.java#L67-L71) | `verifyOtp` | Nhận mã OTP |
| Controller | [`…/controller/AuthController.java` 77–80](../src/main/java/com/example/citizen_journalism/controller/AuthController.java#L77-L80) | `resendOtp` | Gửi lại mã |
| Service | [`…/service/AuthService.java` 108–116](../src/main/java/com/example/citizen_journalism/service/AuthService.java#L108-L116) | `verifyRegistration` | Kích hoạt tài khoản khi mã đúng |
| Service | [`…/service/AuthService.java` 119–122](../src/main/java/com/example/citizen_journalism/service/AuthService.java#L119-L122) | `resendRegistrationOtp` | Gửi lại mã đăng ký |
| Service | [`…/service/AuthService.java` 267–274](../src/main/java/com/example/citizen_journalism/service/AuthService.java#L267-L274) | `findPendingUser` | Tìm tài khoản đang chờ xác thực |
| Service | [`…/service/OtpService.java` 56–91](../src/main/java/com/example/citizen_journalism/service/OtpService.java#L56-L91) | `issue` | Tạo mã OTP, gửi email |
| Service | [`…/service/OtpService.java` 110–136](../src/main/java/com/example/citizen_journalism/service/OtpService.java#L110-L136) | `verify` | Kiểm tra mã (hết hạn, số lần sai) |
| Service | [`…/service/OtpService.java` 157–174](../src/main/java/com/example/citizen_journalism/service/OtpService.java#L157-L174) | `buildEmail` | Soạn nội dung email OTP |
| Service | [`…/service/MailService.java` 53–79](../src/main/java/com/example/citizen_journalism/service/MailService.java#L53-L79) | `send` | Gửi email |
| Entity | [`…/entity/OtpToken.java`](../src/main/java/com/example/citizen_journalism/entity/OtpToken.java) | | Bảng lưu mã OTP |

## 5. Submit Breaking News & 6. Submit Complaint — `POST /api/submissions`

Hai chức năng dùng **chung một luồng code**, chỉ khác giá trị `category` (`HOT_NEWS` / `COMPLAINT`).

| Tầng | Vị trí | Hàm | Làm gì |
|---|---|---|---|
| Controller | [`…/controller/SubmissionController.java` 50–53](../src/main/java/com/example/citizen_journalism/controller/SubmissionController.java#L50-L53) | `getFormOptions` | Các loại phản ánh vai trò đó được chọn, tỉnh thành… |
| Controller | [`…/controller/SubmissionController.java` 61–67](../src/main/java/com/example/citizen_journalism/controller/SubmissionController.java#L61-L67) | `create` | Nhận form + tệp đính kèm |
| Service | [`…/service/SubmissionService.java` 76–86](../src/main/java/com/example/citizen_journalism/service/SubmissionService.java#L76-L86) | `getFormOptions` | Dựng dữ liệu cho form |
| Service | [`…/service/SubmissionService.java` 88–153](../src/main/java/com/example/citizen_journalism/service/SubmissionService.java#L88-L153) | `create` | Tạo hồ sơ, mã tra cứu + PIN, lưu bằng chứng |
| Service | [`…/service/SubmissionService.java` 161–202](../src/main/java/com/example/citizen_journalism/service/SubmissionService.java#L161-L202) | `validate` | Kiểm tra từng ô của form |
| Service | [`…/service/SubmissionService.java` 258–287](../src/main/java/com/example/citizen_journalism/service/SubmissionService.java#L258-L287) | `sendReceipt`, `buildReceiptEmail` | Gửi email biên nhận |
| Service | [`…/service/SubmissionEventService.java` 31–41](../src/main/java/com/example/citizen_journalism/service/SubmissionEventService.java#L31-L41) | `record` | Ghi lịch sử xử lý hồ sơ |
| Entity | [`…/entity/Submission.java` 164–166](../src/main/java/com/example/citizen_journalism/entity/Submission.java#L164-L166) | `ReportCategory` | Loại phản ánh và vai trò được gửi |
| DTO | [`…/dto/submission/CreateSubmissionRequest.java`](../src/main/java/com/example/citizen_journalism/dto/submission/CreateSubmissionRequest.java), [`SubmissionReceipt.java`](../src/main/java/com/example/citizen_journalism/dto/submission/SubmissionReceipt.java) | | Dữ liệu vào / ra |

## 7. Submit Anonymously

Nằm trong luồng gửi thông tin ở trên.

| Tầng | Vị trí | Làm gì |
|---|---|---|
| Service | [`…/service/SubmissionService.java` 95–114](../src/main/java/com/example/citizen_journalism/service/SubmissionService.java#L95-L114) | Gửi ẩn danh thì không lưu tên, SĐT, email, CCCD |
| Service | [`…/service/SubmissionService.java` 138](../src/main/java/com/example/citizen_journalism/service/SubmissionService.java#L138) | Chọn email nhận biên nhận |
| Service | [`…/service/SubmissionService.java` 174](../src/main/java/com/example/citizen_journalism/service/SubmissionService.java#L174) | Chỉ bắt buộc thông tin liên hệ khi không ẩn danh |
| Entity | [`…/entity/Submission.java` 47–49](../src/main/java/com/example/citizen_journalism/entity/Submission.java#L47-L49) | Cột `is_anonymous` |

## 8. Attach Supporting Materials

| Tầng | Vị trí | Hàm | Làm gì |
|---|---|---|---|
| Service | [`…/service/SubmissionService.java` 205–228](../src/main/java/com/example/citizen_journalism/service/SubmissionService.java#L205-L228) | `saveEvidence` | Lưu từng tệp bằng chứng của hồ sơ |
| Service | [`…/service/SubmissionService.java` 231–242](../src/main/java/com/example/citizen_journalism/service/SubmissionService.java#L231-L242) | `fileTypeOf` | Phân loại ảnh / video / tài liệu |
| Service | [`…/service/SubmissionService.java` 245–251](../src/main/java/com/example/citizen_journalism/service/SubmissionService.java#L245-L251) | `originalNameOf` | Lấy tên tệp gốc an toàn |
| Service | [`…/service/FileStorageService.java` 79–92](../src/main/java/com/example/citizen_journalism/service/FileStorageService.java#L79-L92) | `store` | Ghi tệp xuống ổ đĩa |
| Service | [`…/service/FileStorageService.java` 99–112](../src/main/java/com/example/citizen_journalism/service/FileStorageService.java#L99-L112) | `validate` | Kiểm tra định dạng, dung lượng |
| Service | [`…/service/FileStorageService.java` 115–125](../src/main/java/com/example/citizen_journalism/service/FileStorageService.java#L115-L125) | `delete` | Xoá tệp |
| Config | [`…/config/WebConfig.java`](../src/main/java/com/example/citizen_journalism/config/WebConfig.java) | | Phục vụ thư mục `/uploads` |
| Entity | [`…/entity/Evidence.java`](../src/main/java/com/example/citizen_journalism/entity/Evidence.java) | | Bảng bằng chứng đính kèm |

## 9. Track Submission Status

| Tầng | Vị trí | Hàm | Làm gì |
|---|---|---|---|
| Controller | [`…/controller/TrackingController.java` 30–33](../src/main/java/com/example/citizen_journalism/controller/TrackingController.java#L30-L33) | `track` | Tra cứu công khai bằng mã + PIN |
| Controller | [`…/controller/SubmissionController.java` 70–75](../src/main/java/com/example/citizen_journalism/controller/SubmissionController.java#L70-L75) | `listMine` | Danh sách "Thông tin đã gửi" |
| Controller | [`…/controller/SubmissionController.java` 78–81](../src/main/java/com/example/citizen_journalism/controller/SubmissionController.java#L78-L81) | `getMine` | Chi tiết 1 hồ sơ của mình |
| Service | [`…/service/SubmissionTrackingService.java` 68–99](../src/main/java/com/example/citizen_journalism/service/SubmissionTrackingService.java#L68-L99) | `track` | Kiểm tra PIN, khoá tạm khi sai nhiều lần |
| Service | [`…/service/SubmissionTrackingService.java` 104–111](../src/main/java/com/example/citizen_journalism/service/SubmissionTrackingService.java#L104-L111) | `listMine` | Phân trang hồ sơ của người dùng |
| Service | [`…/service/SubmissionTrackingService.java` 114–120](../src/main/java/com/example/citizen_journalism/service/SubmissionTrackingService.java#L114-L120) | `getMine` | Lấy 1 hồ sơ (đúng chủ) |
| Service | [`…/service/SubmissionTrackingService.java` 135–162](../src/main/java/com/example/citizen_journalism/service/SubmissionTrackingService.java#L135-L162) | `toDetail` | Dựng chi tiết + dòng thời gian |
| Repository | [`…/repository/SubmissionRepository.java` 51–54](../src/main/java/com/example/citizen_journalism/repository/SubmissionRepository.java#L51-L54) | `updatePinGuard` | Cập nhật số lần sai PIN / thời gian khoá |

## 10. Track Article Status

**Chưa làm.**

## 11. Manage draft (bài nghiên cứu của Chuyên gia) — `/api/research`

| Tầng | Vị trí | Hàm | Làm gì |
|---|---|---|---|
| Controller | [`…/controller/ResearchController.java` 46–88](../src/main/java/com/example/citizen_journalism/controller/ResearchController.java#L46-L88) | `options`, `list`, `get`, `create`, `update`, `delete` | Toàn bộ API bài nghiên cứu |
| Service | [`…/service/ResearchArticleService.java` 70–82](../src/main/java/com/example/citizen_journalism/service/ResearchArticleService.java#L70-L82) | `getOptions` | Lĩnh vực, giới hạn ảnh… |
| Service | [`…/service/ResearchArticleService.java` 85–116](../src/main/java/com/example/citizen_journalism/service/ResearchArticleService.java#L85-L116) | `list`, `get`, `create`, `update`, `delete` | Danh sách nháp / đã nộp, xem, tạo, sửa, xoá |
| Service | [`…/service/ResearchArticleService.java` 120–183](../src/main/java/com/example/citizen_journalism/service/ResearchArticleService.java#L120-L183) | `save` | Lưu bài, xử lý ảnh thêm / gỡ / giữ |
| Service | [`…/service/ResearchArticleService.java` 186–244](../src/main/java/com/example/citizen_journalism/service/ResearchArticleService.java#L186-L244) | `validateCommon`, `validateForSubmit` | Điều kiện lưu nháp / nộp bài |
| Service | [`…/service/ResearchArticleService.java` 254–260](../src/main/java/com/example/citizen_journalism/service/ResearchArticleService.java#L254-L260) | `findEditable` | Chỉ bản nháp mới sửa / xoá được |
| Entity | [`…/entity/ResearchArticle.java`](../src/main/java/com/example/citizen_journalism/entity/ResearchArticle.java) | | Bảng `research_articles` |
| Repository | [`…/repository/ResearchArticleRepository.java`](../src/main/java/com/example/citizen_journalism/repository/ResearchArticleRepository.java) | | Truy vấn theo tác giả + trạng thái |
| DTO | [`…/dto/research/SaveResearchRequest.java`](../src/main/java/com/example/citizen_journalism/dto/research/SaveResearchRequest.java) | | Dữ liệu lưu / nộp bài |

## 12. Register as Contributor — `/api/contributor-applications`

| Tầng | Vị trí | Hàm | Làm gì |
|---|---|---|---|
| Controller | [`…/controller/ContributorApplicationController.java` 44–47](../src/main/java/com/example/citizen_journalism/controller/ContributorApplicationController.java#L44-L47) | `getOverview` | Điều kiện + đơn hiện tại |
| Controller | [`…/controller/ContributorApplicationController.java` 49–55](../src/main/java/com/example/citizen_journalism/controller/ContributorApplicationController.java#L49-L55) | `apply` | Nộp đơn + giấy tờ |
| Service | [`…/service/ContributorApplicationService.java` 119–160](../src/main/java/com/example/citizen_journalism/service/ContributorApplicationService.java#L119-L160) | `apply` | Tạo đơn, lưu giấy tờ |
| Service | [`…/service/ContributorApplicationService.java` 246–266](../src/main/java/com/example/citizen_journalism/service/ContributorApplicationService.java#L246-L266) | `checkEligibility` | Tuổi, điểm uy tín, hồ sơ cá nhân |
| Service | [`…/service/ContributorApplicationService.java` 269–291](../src/main/java/com/example/citizen_journalism/service/ContributorApplicationService.java#L269-L291) | `validate` | Kiểm tra từng ô của đơn |
| Entity | [`…/entity/ContributorApplication.java`](../src/main/java/com/example/citizen_journalism/entity/ContributorApplication.java) | | Bảng đơn đăng ký CTV |

## 13. Track Contributor Application

| Tầng | Vị trí | Hàm | Làm gì |
|---|---|---|---|
| Service | [`…/service/ContributorApplicationService.java` 99–117](../src/main/java/com/example/citizen_journalism/service/ContributorApplicationService.java#L99-L117) | `getOverview` | Trạng thái đơn của người nộp |
| Controller | [`…/controller/ContributorApplicationController.java` 57–60](../src/main/java/com/example/citizen_journalism/controller/ContributorApplicationController.java#L57-L60) | `withdraw` | Rút đơn |
| Service | [`…/service/ContributorApplicationService.java` 162–172](../src/main/java/com/example/citizen_journalism/service/ContributorApplicationService.java#L162-L172) | `withdraw` | Rút đơn (chỉ khi đang chờ) |
| Controller | [`…/controller/ContributorApplicationController.java` 63–67](../src/main/java/com/example/citizen_journalism/controller/ContributorApplicationController.java#L63-L67) | `openDocument` | Xem giấy tờ đã nộp |
| Service | [`…/service/ContributorApplicationService.java` 323–343](../src/main/java/com/example/citizen_journalism/service/ContributorApplicationService.java#L323-L343) | `toView` | Dựng thông tin đơn + các bước |
| Controller | [`…/controller/EditorController.java` 74–99](../src/main/java/com/example/citizen_journalism/controller/EditorController.java#L74-L99) | `listApplications`, `getApplication`, `reviewApplication`, `openApplicationDocument` | Biên tập viên xét đơn |
| Service | [`…/service/ContributorApplicationService.java` 214–236](../src/main/java/com/example/citizen_journalism/service/ContributorApplicationService.java#L214-L236) | `review` | Chuyển tiếp / từ chối |
| Service | [`…/service/ContributorApplicationService.java` 371–394](../src/main/java/com/example/citizen_journalism/service/ContributorApplicationService.java#L371-L394) | `notifyApplicant` | Email báo kết quả |

## 14. Update Profile — `/api/users/me`

| Tầng | Vị trí | Làm gì |
|---|---|---|
| Controller | [`…/controller/UserController.java` 45–82](../src/main/java/com/example/citizen_journalism/controller/UserController.java#L45-L82) | Xem / sửa hồ sơ, đổi email (OTP), đổi / xoá ảnh đại diện |
| Service | [`…/service/UserService.java` 45–121](../src/main/java/com/example/citizen_journalism/service/UserService.java#L45-L121) | Xử lý tương ứng |
| DTO | [`…/dto/user/UpdateProfileRequest.java`](../src/main/java/com/example/citizen_journalism/dto/user/UpdateProfileRequest.java) | Dữ liệu sửa hồ sơ |

## 15. Change Password — `PUT /api/auth/change-password`

| Tầng | Vị trí | Hàm | Làm gì |
|---|---|---|---|
| Controller | [`…/controller/AuthController.java` 123–128](../src/main/java/com/example/citizen_journalism/controller/AuthController.java#L123-L128) | `changePassword` | Nhận mật khẩu cũ + mới |
| Service | [`…/service/AuthService.java` 220–230](../src/main/java/com/example/citizen_journalism/service/AuthService.java#L220-L230) | `changePassword` | Kiểm tra mật khẩu cũ |
| Service | [`…/service/AuthService.java` 237–241](../src/main/java/com/example/citizen_journalism/service/AuthService.java#L237-L241) | `applyNewPassword` | Mã hoá và lưu mật khẩu mới |

## 16. Forgot Password

| Tầng | Vị trí | Hàm | Làm gì |
|---|---|---|---|
| Controller | [`…/controller/AuthController.java` 106–117](../src/main/java/com/example/citizen_journalism/controller/AuthController.java#L106-L117) | `forgotPassword`, `resetPassword` | Gửi mã / đặt lại mật khẩu |
| Service | [`…/service/AuthService.java` 193–214](../src/main/java/com/example/citizen_journalism/service/AuthService.java#L193-L214) | `forgotPassword`, `resetPassword` | Gửi OTP, kiểm tra mã, đặt mật khẩu mới |
| Service | `OtpService` (xem mục 4) | | Tạo / kiểm tra mã OTP |

## 17. Dashboard Sysadmin (Manage account) — `/api/admin`

| Tầng | Vị trí | Làm gì |
|---|---|---|
| Controller | [`…/controller/AdminController.java` 44–77](../src/main/java/com/example/citizen_journalism/controller/AdminController.java#L44-L77) | Thống kê, danh sách, tạo tài khoản, khoá / mở, đổi vai trò |
| Service | [`…/service/AdminService.java` 50–157](../src/main/java/com/example/citizen_journalism/service/AdminService.java#L50-L157) | Xử lý tương ứng |
| Config | [`…/config/AdminAccountInitializer.java` 53–77](../src/main/java/com/example/citizen_journalism/config/AdminAccountInitializer.java#L53-L77) | Tạo sẵn tài khoản Admin khi chạy lần đầu |

---

## Thêm: Dashboard Biên tập viên — `/api/editor`

| Tầng | Vị trí | Làm gì |
|---|---|---|
| Controller | [`…/controller/EditorController.java` 51–70](../src/main/java/com/example/citizen_journalism/controller/EditorController.java#L51-L70) | Tổng quan, hàng đợi hồ sơ, chi tiết hồ sơ |
| Service | [`…/service/EditorService.java` 32–61](../src/main/java/com/example/citizen_journalism/service/EditorService.java#L32-L61) | Xử lý tương ứng |
| Service | [`…/service/SubmissionTrackingService.java` 125–130](../src/main/java/com/example/citizen_journalism/service/SubmissionTrackingService.java#L125-L130) | `getForStaff`: chi tiết hồ sơ cho toà soạn |

## Phần dùng chung

| Vị trí | Làm gì |
|---|---|
| [`…/dto/ApiResponse.java`](../src/main/java/com/example/citizen_journalism/dto/ApiResponse.java) | Khuôn chung của mọi phản hồi |
| [`…/exception/AppException.java`](../src/main/java/com/example/citizen_journalism/exception/AppException.java) | Lỗi nghiệp vụ |
| [`…/exception/GlobalExceptionHandler.java`](../src/main/java/com/example/citizen_journalism/exception/GlobalExceptionHandler.java) | Đổi mọi lỗi thành phản hồi JSON |
| [`…/config/SecurityConfig.java`](../src/main/java/com/example/citizen_journalism/config/SecurityConfig.java) | Đường dẫn nào cần vai trò gì |
| [`…/security/RestAuthenticationHandler.java`](../src/main/java/com/example/citizen_journalism/security/RestAuthenticationHandler.java) | Phản hồi khi chưa đăng nhập / không đủ quyền |
