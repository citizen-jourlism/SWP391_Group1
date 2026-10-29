# SWP391 PROJECT REPORT

**Software Design Specification**

Hanoi, Aug 2026

## Table of Contents

- [I. High Level Design](#i-high-level-design)
  - [1. Software Architecture](#1-software-architecture)
    - [Architecture component descriptions](#architecture-component-descriptions)
  - [2. Package Diagram](#2-package-diagram)
    - [Package descriptions](#package-descriptions)
  - [3. Database Design](#3-database-design)
    - [Entity: User](#entity-user)
    - [Entity: Categories](#entity-categories)
    - [Entity: Submissions](#entity-submissions)
    - [Entities: Evidences](#entities-evidences)
    - [Entities: Field_assignments](#entities-field_assignments)
    - [Entities: editorial_reviews](#entities-editorial_reviews)
    - [Entities: Reputation_logs](#entities-reputation_logs)
- [II. Detailed Code Design](#ii-detailed-code-design)
  - [1. Authentication (Register, Verify Email, Log In, Forgot / Change Password)](#1-authentication-register-verify-email-log-in-forgot-change-password)
    - [1.1 Class Diagram](#11-class-diagram)
    - [1.2 Register Account](#12-register-account)
    - [1.3 Verify Account (Email OTP)](#13-verify-account-email-otp)
    - [1.4 Log In](#14-log-in)
    - [1.5 Forgot Password](#15-forgot-password)
    - [1.6 Change Password](#16-change-password)
  - [2. Submit Information (Breaking News, Complaint, Anonymous, Supporting Materials)](#2-submit-information-breaking-news-complaint-anonymous-supporting-materials)
    - [2.1 Class Diagram](#21-class-diagram)
    - [2.2 Submit Breaking News / Complaint (incl. Submit Anonymously)](#22-submit-breaking-news-complaint-incl-submit-anonymously)
    - [2.3 Attach Supporting Materials](#23-attach-supporting-materials)
  - [3. Track Submission Status](#3-track-submission-status)
    - [3.1 Class Diagram](#31-class-diagram)
    - [3.2 Track Submission by Code and PIN](#32-track-submission-by-code-and-pin)
    - [3.3 View My Submissions](#33-view-my-submissions)
  - [4. Register as Contributor and Track Contributor Application](#4-register-as-contributor-and-track-contributor-application)
    - [4.1 Class Diagram](#41-class-diagram)
    - [4.2 Register as Contributor](#42-register-as-contributor)
    - [4.3 Track Contributor Application](#43-track-contributor-application)
    - [4.4 Editor Reviews Contributor Application](#44-editor-reviews-contributor-application)
  - [5. Manage Draft (Research Articles)](#5-manage-draft-research-articles)
    - [5.1 Class Diagram](#51-class-diagram)
    - [5.2 Save Draft / Submit Research Article](#52-save-draft-submit-research-article)
    - [5.3 Manage Drafts (List, Reopen, Delete)](#53-manage-drafts-list-reopen-delete)
  - [6. Update Profile](#6-update-profile)
    - [6.1 Class Diagram](#61-class-diagram)
    - [6.2 Update Profile Information](#62-update-profile-information)
    - [6.3 Change Email](#63-change-email)
    - [6.4 Update Avatar](#64-update-avatar)
  - [7. Dashboard System Admin (Manage Account)](#7-dashboard-system-admin-manage-account)
    - [7.1 Class Diagram](#71-class-diagram)
    - [7.2 Admin Dashboard and Search Accounts](#72-admin-dashboard-and-search-accounts)
    - [7.3 Create Account](#73-create-account)
    - [7.4 Lock / Unlock Account and Change Role](#74-lock-unlock-account-and-change-role)
- [III. Other Design Specifications](#iii-other-design-specifications)

---

## I. High Level Design

### 1. Software Architecture

[The content of this section includes the overall architectural diagram which includes the sub-systems and/or components, the external systems (if any), and the relationships (communication messages) among them. You need also provide the explanation for each of the diagram components (modules, sub-systems, external systems, etc.)].

![Software Architecture](./Group1_SDS_images/diagram_01_software_architecture.png)

#### Architecture component descriptions

| No | Component | Description |
| --- | --- | --- |
| Client Tier |  |  |
| 01 | pages | &lt;Description of the component&gt; |
| 02 | … |  |
| Application Tier |  |  |
| 01 | JWT Security Filter | &lt;Description of the component&gt; |
| 02 | … |  |

### 2. Package Diagram

![Package Diagram](./Group1_SDS_images/diagram_02_package_diagram.png)

[Open original diagram](https://drive.google.com/file/d/1J6CqDTJHWgLDVDOI5jXutA1MmF_ozNp0/view?usp=sharing)

#### Package descriptions

| No | Package | Description |
| --- | --- | --- |
| 01 | member_authority | &lt;Description of the package + class naming conventions&gt; |
| 02 | … |  |

### 3. Database Design

![Database Design](./Group1_SDS_images/diagram_03_database_design.png)

#### Entity: User

| Field | Type | Value |
| --- | --- | --- |
| id | VARCHAR(10) | Mã định danh duy nhất của người dùng (gồm 2 chữ cái và 4 số, ví dụ: HE1941). |
| role | VARCHAR(30) | Vai trò hệ thống: CITIZEN, CONTRIBUTOR, EXPERT, EDITOR, DEPUTY_EIC, EIC, SYSTEM_ADMIN. |
| full_name | VARCHAR(255) | Họ và tên đầy đủ của người dùng. |
| email | VARCHAR(255) | Địa chỉ email dùng để đăng nhập chính và nhận thông báo. |
| phone | VARCHAR(20) | Số điện thoại dùng để liên lạc hoặc nhận SMS OTP. |
| password_hash | VARCHAR(255) | Mật khẩu mã hóa bảo mật (Bcrypt/Argon2). |
| status | VARCHAR(30) | Trạng thái tài khoản: PENDING_OTP, ACTIVE, LOCKED (bị khóa do vi phạm hoặc do Phó TBT/Admin xử phạt). |
| is_verified | BOOLEAN | Trạng thái xác thực tài khoản qua EKYC/OTP. |
| expertise_fields | TEXT | Lĩnh vực chuyên môn của CTV/Chuyên gia (Kinh tế, Môi trường,...; để NULL nếu là Citizen). |
| credentials_file_data | LONGBLOB | Dữ liệu nhị phân chứa gói tài liệu, ảnh thẻ nhà báo/CCCD hoặc file Microsoft 365 Word, Excel, PPT, PDF. |
| credentials_files_meta | JSON | Danh sách metadata (tên tệp, mime_type, file_size) do hệ thống tự trích xuất khi nộp hồ sơ. |
| upgrade_status | VARCHAR(30) | Trạng thái xét duyệt nâng cấp: NONE, PENDING, APPROVED, REJECTED. |
| reputation_score | INT | Điểm tín nhiệm cache hiện tại (mặc định 50 cho Citizen, 100 cho CTV). |

#### Entity: Categories

| Field | Value |
| --- | --- |
| id | Số nguyên tự tăng (INT, PK); định danh duy nhất cho từng chuyên mục/lĩnh vực |
| name | Tên chuyên mục hiển thị (Kinh tế, Chính trị - Xã hội, Pháp luật, Đời sống, Khoa học - Môi trường). |
| slug | Chuỗi ký tự chuẩn hóa duy nhất (VARCHAR, UNIQUE); định danh chuyên mục trên đường dẫn. |
| deputy_eic_id | Khóa ngoại (FK -&gt; users.id, UNIQUE, NULL); chỉ định đích danh đúng 1 Phó Tổng biên tập phụ trách lĩnh vực này. |
| is_active | Giá trị boolean (TRUE: chuyên mục đang mở nhận bài; FALSE: tạm dừng tiếp nhận). |

#### Entity: Submissions

| Field | Value |
| --- | --- |
| id | Số nguyên lớn tự tăng (BIGINT, PK); định danh duy nhất cho từng bản ghi tin/bài. |
| type | Phân loại hình thức nội dung: HOT_NEWS (Tin nóng), COMPLAINT (Khiếu nại/Phản ánh), CONTRIBUTOR_POST (Bài viết CTV tại hiện trường), RESEARCH_PAPER (Bài nghiên cứu Chuyên gia). |
| category_id | Khóa ngoại (FK -&gt; categories.id, NULL); chuyên mục/lĩnh vực được BTV gán sau khi sàng lọc để điều tuyến bài đến đúng Phó TBT phụ trách. |
| author_id | Khóa ngoại (FK -&gt; users.id); tài khoản người gửi tin/bài (để phản hồi, trả nhuận bút hoặc truy vết). |
| assigned_editor_id | Khóa ngoại (FK -&gt; users.id, NULL); Biên tập viên được phân công trực tiếp thụ lý bài viết. |
| title | Chuỗi văn bản tiêu đề của tin nóng, đơn phản ánh hoặc bài viết. |
| content | Toàn văn nội dung bài/tin (LONGTEXT). |
| is_anonymous | Giá trị boolean (TRUE: nộp ẩn danh; FALSE: công khai danh tính). |
| status | Chu trình trạng thái nghiệp vụ:<br>• Tiếp nhận: PENDING, CANCELLED<br>• Biên tập: IN_REVIEW, NEED_MORE_INFO, REJECTED<br>• Duyệt chuyên môn (Phó TBT): DEPUTY_PENDING, DEPUTY_REJECTED<br>• Ban biên tập (Tổng biên tập): EIC_PENDING, EIC_REJECTED, READY_FOR_PUBLISHING, PUBLISHED (Áp dụng đối với tin tức mức độ nghiêm trọng/Breaking)<br>• Hậu kiểm: CORRECTED, RETRACTED |
| priority | Mức độ ưu tiên xử lý: LOW, MEDIUM, HIGH, BREAKING. |
| impact_score | Điểm số tác động xã hội do BTV thẩm định dựa trên khu vực, số người và loại vấn đề (mặc định 0). |
| is_spam | Giá trị boolean (kết quả quét AI; TRUE: nghi vấn thư rác/quảng cáo, FALSE: nội dung hợp lệ). |
| ai_summary | Đoạn văn bản tóm tắt nội dung cốt lõi do AI tự động trích xuất (TEXT, NULL). |
| duplicate_submission_id | Khóa ngoại tự tham chiếu (FK -&gt; submissions.id, NULL); trỏ tới ID bài viết gốc đã có nếu AI/BTV phát hiện sự kiện bị gửi trùng lặp để phục vụ gộp tin. |
| is_revealed | Giá trị boolean (mặc định FALSE); ghi nhận Tổng biên tập đã giải mật danh tính bài ẩn danh này hay chưa. |
| reveal_reason | Căn cứ/lý do bắt buộc phải tra cứu tác giả bài viết ẩn danh do Tổng biên tập nhập (TEXT, NULL). |
| created_at | Mốc thời gian (DATETIME); thời điểm gửi tin vào hệ thống. |
| updated_at | Mốc thời gian (DATETIME); thời điểm có thay đổi nội dung hoặc trạng thái. |

#### Entities: Evidences

[Add one block per additional entity following the same structure.]

| Field | Value |
| --- | --- |
| id | Số nguyên lớn tự tăng (BIGINT, PK); định danh duy nhất cho tệp tư liệu/bằng chứng. |
| submission_id | Khóa ngoại (FK -&gt; submissions.id, NULL); gắn tệp tư liệu vào bài viết tương ứng. |
| uploaded_by | Khóa ngoại (FK -&gt; users.id); tài khoản của người gửi tư liệu lên hệ thống. |
| file_url | Đường dẫn lưu trữ tệp tin trên dịch vụ lưu trữ số (Cloud / S3 Storage). |
| file_type | Phân loại tệp: IMAGE, VIDEO, AUDIO, DOCUMENT. |
| source_ref | Chuỗi văn bản/URL chứa nguồn tài liệu trích dẫn tham chiếu (dành cho Chuyên gia). |
| created_at | Mốc thời gian (DATETIME); thời điểm tải tệp tư liệu thành công. |

#### Entities: Field_assignments

| Field | Value |
| --- | --- |
| id | Số nguyên lớn tự tăng (BIGINT, PK); định danh duy nhất cho nhiệm vụ tác nghiệp hiện trường. |
| submission_id | Khóa ngoại (FK -&gt; submissions.id, NULL); nguồn tin nóng/khiếu nại ban đầu cần điều tra xác minh. |
| created_by | Khóa ngoại (FK -&gt; users.id); Biên tập viên ra lệnh điều phối nhiệm vụ. |
| title | Chuỗi văn bản tóm tắt nội dung nhiệm vụ được giao tác nghiệp tại hiện trường. |
| assignment_mode | Hình thức giao việc: BROADCAST (gửi mở cho toàn bộ mạng lưới CTV tranh nhận) hoặc DIRECT (BTV chọn đích danh một CTV do tính chất đặc biệt). |
| contributor_id | Khóa ngoại (FK -&gt; users.id, NULL); CTV nhận nhiệm vụ tác nghiệp (để NULL khi mới tạo dạng BROADCAST, chỉ điền ID khi BTV giao thẳng hoặc khi có CTV bấm nhận). |
| claimed_at | Mốc thời gian (DATETIME, NULL); thời điểm CTV đầu tiên xác nhận nhận lệnh (xử lý cơ chế First-come-first-served, khóa tranh chấp). |
| output_submission_id | Khóa ngoại (FK -&gt; submissions.id, NULL); trỏ tới bài viết hoàn chỉnh (loại CONTRIBUTOR_POST) mà CTV nộp về sau khi tác nghiệp. |
| status | Vòng đời nhiệm vụ: OPEN (đang mở chờ CTV nhận), ASSIGNED (đã giao chỉ định), ACCEPTED (CTV đã nhận việc), CANCELLED (hủy nhiệm vụ), COMPLETED (đã hoàn thành nộp sản phẩm). |
| deadline | Mốc thời gian (DATETIME, NULL); hạn chót CTV phải hoàn thành và nộp tư liệu về. |
| created_at | Mốc thời gian (DATETIME); thời điểm tạo nhiệm vụ. |
| updated_at | Mốc thời gian (DATETIME); thời điểm cập nhật trạng thái hoặc người nhận việc. |

#### Entities: editorial_reviews

| Field | Value |
| --- | --- |
| id | Số nguyên lớn tự tăng (BIGINT, PK); định danh một lượt đánh giá/phản hồi trong luồng kiểm duyệt. |
| submission_id | Khóa ngoại (FK -&gt; submissions.id); bài viết nhận ý kiến thẩm duyệt. |
| reviewer_id | Khóa ngoại (FK -&gt; users.id); người tiến hành kiểm duyệt. |
| review_role | Vai trò người kiểm duyệt tại thời điểm thao tác: EDITOR, DEPUTY_EIC, EIC. |
| action | Quyết định đưa ra: REQUEST_INFO (yêu cầu bổ sung chứng cứ), APPROVE (duyệt thông qua), REJECT (từ chối), REQUEST_EDIT (yêu cầu sửa văn bản), ESCALATE (Phó TBT chuyển tiếp lên TBT khi gặp tin High/Breaking), RETRACT (gỡ bỏ bài). |
| comments | Ghi chú ý kiến chuyên môn, lý do từ chối, giải trình hoặc chỉ đạo (TEXT). |
| content_snapshot | Bản chụp nội dung văn bản (LONGTEXT, NULL); lưu nguyên văn tiêu đề/nội dung tại thời điểm BTV sửa bài hoặc khi TBT gỡ bài phục vụ đối soát, thanh tra. |
| created_at | Mốc thời gian (DATETIME); thời điểm tạo ghi chú kiểm duyệt. |

#### Entities: Reputation_logs

| Field | Value |
| --- | --- |
| id | Số nguyên lớn tự tăng (BIGINT, PK); định danh duy nhất cho mỗi lượt biến động điểm uy tín. |
| user_id | Khóa ngoại (FK -&gt; users.id); xác định CTV/Chuyên gia/Citizen bị tăng hoặc trừ điểm. |
| points_change | Số nguyên (dương khi thưởng điểm, âm khi xử phạt vi phạm). |
| reason | Mã định danh lý do: INITIAL_CONTRIBUTOR_ONBOARDING, SUBMISSION_APPROVED, TASK_COMPLETED_ON_TIME, TASK_LATE, INACCURATE_EVIDENCE, SPAM_REPORTED, COPYRIGHT_VIOLATION. |
| related_submission_id | Khóa ngoại (FK -&gt; submissions.id, NULL); trỏ tới bài viết hoặc vụ việc cụ thể là nguyên nhân dẫn đến việc cộng/trừ điểm. |
| created_at | Mốc thời gian (DATETIME); thời điểm ghi nhận biến động điểm. |

## II. Detailed Code Design

### 1. Authentication (Register, Verify Email, Log In, Forgot / Change Password)

Register Account, Verify user authentic (email OTP), Log In, Forgot Password and Change Password. All endpoints live under /api/auth and are handled by AuthController -&gt; AuthService. OTP codes are generated, hashed and checked by OtpService; JWT tokens are issued by JwtService.

#### 1.1 Class Diagram

![Authentication - Class Diagram](./Group1_SDS_images/figure_01_authentication_class_diagram.png)

*Figure 1. Authentication - Class Diagram*

#### 1.2 Register Account

A new citizen account is created with status PENDING_OTP and a 6-digit OTP is mailed. An email that was registered but never verified can register again (the old record is reused).

![Sequence Diagram - Register Account](./Group1_SDS_images/figure_02_sequence_diagram_register_account.png)

*Figure 2. Sequence Diagram - Register Account*

#### 1.3 Verify Account (Email OTP)

The latest unused OTP is checked (expiry, max attempts, BCrypt hash). Wrong attempts are kept even when an exception is thrown (noRollbackFor). A correct code activates the account.

![Sequence Diagram - Verify Account (Email OTP)](./Group1_SDS_images/figure_03_sequence_diagram_verify_account_email_otp.png)

*Figure 3. Sequence Diagram - Verify Account (Email OTP)*

#### 1.4 Log In

Users sign in with email or username. Failed attempts are counted and the account is locked temporarily after too many wrong passwords. Account status is only revealed after the password is correct.

![Sequence Diagram - Log In](./Group1_SDS_images/figure_04_sequence_diagram_log_in.png)

*Figure 4. Sequence Diagram - Log In*

#### 1.5 Forgot Password

Step 1 sends an OTP only to ACTIVE accounts but always returns the same response, so attackers cannot discover which emails are registered. Step 2 verifies the OTP and sets the new password.

![Sequence Diagram - Forgot Password](./Group1_SDS_images/figure_05_sequence_diagram_forgot_password.png)

*Figure 5. Sequence Diagram - Forgot Password*

#### 1.6 Change Password

A signed-in user must enter the current password; the new password must differ from the old one.

![Sequence Diagram - Change Password](./Group1_SDS_images/figure_06_sequence_diagram_change_password.png)

*Figure 6. Sequence Diagram - Change Password*

### 2. Submit Information (Breaking News, Complaint, Anonymous, Supporting Materials)

Submit Breaking News, Submit Complaint, Submit Anonymously and Attach Supporting Materials. All of them use one endpoint (POST /api/submissions, multipart); the report category decides the type and is restricted by role (ReportCategory).

#### 2.1 Class Diagram

![Submit Information - Class Diagram](./Group1_SDS_images/figure_07_submit_information_class_diagram.png)

*Figure 7. Submit Information - Class Diagram*

#### 2.2 Submit Breaking News / Complaint (incl. Submit Anonymously)

The submission is validated as a whole (all field errors returned at once), saved with a tracking code (KB-yyyy-nnnn) and a hashed 6-digit PIN, logged in the timeline and a receipt is mailed. Anonymous submissions do not store any contact information.

![Sequence Diagram - Submit Breaking News / Complaint (incl. Submit Anonymously)](./Group1_SDS_images/figure_08_sequence_diagram_submit_breaking_news_complaint_incl_submit_anonymously.png)

*Figure 8. Sequence Diagram - Submit Breaking News / Complaint (incl. Submit Anonymously)*

#### 2.3 Attach Supporting Materials

Every file is validated before anything is written. Files are stored on disk and recorded in the evidences table; if anything fails, stored files are deleted and the database transaction is rolled back.

![Sequence Diagram - Attach Supporting Materials](./Group1_SDS_images/figure_09_sequence_diagram_attach_supporting_materials.png)

*Figure 9. Sequence Diagram - Attach Supporting Materials*

### 3. Track Submission Status

Anyone can track a submission with its tracking code and PIN (POST /api/tracking). Signed-in reporters can also see their own submissions under "Thông tin đã gửi".

#### 3.1 Class Diagram

![Track Submission Status - Class Diagram](./Group1_SDS_images/figure_10_track_submission_status_class_diagram.png)

*Figure 10. Track Submission Status - Class Diagram*

#### 3.2 Track Submission by Code and PIN

After 5 wrong PINs, tracking of that submission is locked for 15 minutes. The response never contains the reporter contact information.

![Sequence Diagram - Track Submission by Code and PIN](./Group1_SDS_images/figure_11_sequence_diagram_track_submission_by_code_and_pin.png)

*Figure 11. Sequence Diagram - Track Submission by Code and PIN*

#### 3.3 View My Submissions

Only submissions whose author is the signed-in user are returned; another user's tracking code returns 404.

![Sequence Diagram - View My Submissions](./Group1_SDS_images/figure_12_sequence_diagram_view_my_submissions.png)

*Figure 12. Sequence Diagram - View My Submissions*

### 4. Register as Contributor and Track Contributor Application

A citizen who meets the requirements (complete profile, age &gt;= 18, reputation &gt;= 80, no pending application) applies to become a Contributor. The application then goes PENDING_EDITOR -&gt; PENDING_DEPUTY -&gt; APPROVED, or REJECTED / WITHDRAWN.

#### 4.1 Class Diagram

![Contributor Application - Class Diagram](./Group1_SDS_images/figure_13_contributor_application_class_diagram.png)

*Figure 13. Contributor Application - Class Diagram*

#### 4.2 Register as Contributor

Eligibility is checked again on the server so the API cannot be called directly to bypass the disabled button. Identity documents are stored in a protected folder that is only served through permission-checked APIs.

![Sequence Diagram - Register as Contributor](./Group1_SDS_images/figure_14_sequence_diagram_register_as_contributor.png)

*Figure 14. Sequence Diagram - Register as Contributor*

#### 4.3 Track Contributor Application

The applicant sees the current application, its steps, the editor note and earlier applications, can open uploaded documents and can withdraw while the editor has not reviewed it yet.

![Sequence Diagram - Track Contributor Application](./Group1_SDS_images/figure_15_sequence_diagram_track_contributor_application.png)

*Figure 15. Sequence Diagram - Track Contributor Application*

#### 4.4 Editor Reviews Contributor Application

The editor forwards the application to the Deputy Editor-in-Chief or rejects it with a reason (at least 10 characters). The applicant is notified by email.

![Sequence Diagram - Editor Reviews Contributor Application](./Group1_SDS_images/figure_16_sequence_diagram_editor_reviews_contributor_application.png)

*Figure 16. Sequence Diagram - Editor Reviews Contributor Application*

### 5. Manage Draft (Research Articles)

Experts (researchers) write research articles in a dedicated editor, save them as drafts, come back later and submit them. Only DRAFT articles can be edited or deleted.

#### 5.1 Class Diagram

![Manage Draft - Class Diagram](./Group1_SDS_images/figure_17_manage_draft_class_diagram.png)

*Figure 17. Manage Draft - Class Diagram*

#### 5.2 Save Draft / Submit Research Article

Saving a draft only needs a title or some content. Submitting requires the full checklist. Images are kept, added or removed according to the image list sent by the client; removed image files are deleted.

![Sequence Diagram - Save Draft / Submit Research Article](./Group1_SDS_images/figure_18_sequence_diagram_save_draft_submit_research_article.png)

*Figure 18. Sequence Diagram - Save Draft / Submit Research Article*

#### 5.3 Manage Drafts (List, Reopen, Delete)

The researcher lists drafts or submitted articles, reopens a draft to continue writing, or deletes it together with its images.

![Sequence Diagram - Manage Drafts (List, Reopen, Delete)](./Group1_SDS_images/figure_19_sequence_diagram_manage_drafts_list_reopen_delete.png)

*Figure 19. Sequence Diagram - Manage Drafts (List, Reopen, Delete)*

### 6. Update Profile

Signed-in users view and update their personal information, change their email (verified by an OTP sent to the new address) and change their avatar (/api/users/me).

#### 6.1 Class Diagram

![Update Profile - Class Diagram](./Group1_SDS_images/figure_20_update_profile_class_diagram.png)

*Figure 20. Update Profile - Class Diagram*

#### 6.2 Update Profile Information

A citizen ID number can only belong to one account.

![Sequence Diagram - Update Profile Information](./Group1_SDS_images/figure_21_sequence_diagram_update_profile_information.png)

*Figure 21. Sequence Diagram - Update Profile Information*

#### 6.3 Change Email

The OTP is sent to the NEW email and the new address is stored in the OTP payload; uniqueness is checked again when the code is confirmed.

![Sequence Diagram - Change Email](./Group1_SDS_images/figure_22_sequence_diagram_change_email.png)

*Figure 22. Sequence Diagram - Change Email*

#### 6.4 Update Avatar

The new image is stored first, then the old image file is deleted.

![Sequence Diagram - Update Avatar](./Group1_SDS_images/figure_23_sequence_diagram_update_avatar.png)

*Figure 23. Sequence Diagram - Update Avatar*

### 7. Dashboard System Admin (Manage Account)

The system administrator sees overview statistics and manages accounts: search, create internal accounts (editor, expert...), lock / unlock and change roles.

#### 7.1 Class Diagram

![Manage Account - Class Diagram](./Group1_SDS_images/figure_24_manage_account_class_diagram.png)

*Figure 24. Manage Account - Class Diagram*

#### 7.2 Admin Dashboard and Search Accounts

Statistics are counted directly from the users and submissions tables.

![Sequence Diagram - Admin Dashboard and Search Accounts](./Group1_SDS_images/figure_25_sequence_diagram_admin_dashboard_and_search_accounts.png)

*Figure 25. Sequence Diagram - Admin Dashboard and Search Accounts*

#### 7.3 Create Account

Accounts created by the admin are ACTIVE and verified immediately (no OTP). The user id prefix follows the role, e.g. ED0001 for an editor.

![Sequence Diagram - Create Account](./Group1_SDS_images/figure_26_sequence_diagram_create_account.png)

*Figure 26. Sequence Diagram - Create Account*

#### 7.4 Lock / Unlock Account and Change Role

The admin account itself cannot be changed and no second admin can be created. Unlocking also clears the temporary login lock.

![Sequence Diagram - Lock / Unlock Account and Change Role](./Group1_SDS_images/figure_27_sequence_diagram_lock_unlock_account_and_change_role.png)

*Figure 27. Sequence Diagram - Lock / Unlock Account and Change Role*

## III. Other Design Specifications
