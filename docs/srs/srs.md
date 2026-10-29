**SWP391 PROJECT REPORT**

# Software Requirement Specification

*– Hanoi, Aug 2026 –*

## Table of Contents

- [I. Overall Requirements](#i-overall-requirements)
  - [1. Context Diagram](#1-context-diagram)
  - [2. Main Business Flow](#2-main-business-flow)
    - [2.1 Citizen send Hot News & Complaint intake](#21-citizen-send-hot-news--complaint-intake)
    - [2.2 Expert/Researcher Contributor](#22-expertresearcher-contributor)
    - [2.3 Contributor Registration Process](#23-contributor-registration-process)
    - [2.4 Penalty / Violation Handling Workflow](#24-penalty--violation-handling-workflow)
    - [2.5 Assign Contributor](#25-assign-contributor)
  - [3. Conceptual Data Model](#3-conceptual-data-model)
    - [3.1 Entity Relationship Diagram](#31-entity-relationship-diagram)
    - [3.2 Entity Descriptions](#32-entity-descriptions)
    - [3.3 Data Business Rules](#33-data-business-rules)
  - [4. User Requirements](#4-user-requirements)
    - [4.1 Actors](#41-actors)
    - [4.2 Use Cases (UC)](#42-use-cases-uc)
    - [4.3 Use Case Diagrams](#43-use-case-diagrams)
    - [4.4 Permission Matrix](#44-permission-matrix)
  - [5. System Functionalities](#5-system-functionalities)
    - [5.1 Screen Inventory](#51-screen-inventory)
    - [5.2 External API Inventory](#52-external-api-inventory)
    - [5.3 Background Job Inventory](#53-background-job-inventory)
- [II. Functional Requirements](#ii-functional-requirements)
  - [1. Breaking News](#1-breaking-news)
    - [1.1 Citizen](#11-citizen)
    - [1.2 Editor](#12-editor)
    - [1.4 Deputy Editor-in-chef](#14-deputy-editor-in-chef)
    - [1.5 EIC allowed publish](#15-eic-allowed-publish)
    - [1.3 Contributor confirm task](#13-contributor-confirm-task)
  - [2. User Authentication](#2-user-authentication)
    - [2.1 User Register](#21-user-register)
    - [2.2 User Login](#22-user-login)
  - [3. System Administration](#3-system-administration)
    - [3.1 System Settings](#31-system-settings)
    - [3.2 User Management](#32-user-management)
  - [4. Complaint News](#4-complaint-news)
    - [4.1 Citizen Portal](#41-citizen-portal)
    - [4.2 Contributor Desk](#42-contributor-desk)
    - [4.3 Editor Desk](#43-editor-desk)
    - [4.4 Deputy EIC Desk](#44-deputy-eic-desk)
    - [4.5 EIC Desk](#45-eic-desk)
    - [4.5 System Administrator Monitor](#45-system-administrator-monitor)
  - [5. Background Job Inventory](#5-background-job-inventory)
    - [5.1 Unlock Expired Locked Accounts (JOB-01)](#51-unlock-expired-locked-accounts-job-01)
    - [5.2 Clean Up Old Audit Log Entries (JOB-02)](#52-clean-up-old-audit-log-entries-job-02)
  - [6. External API Inventory](#6-external-api-inventory)
    - [6.1 HTTP Method: URL pattern (API-ID)](#61-http-method-url-pattern-api-id)
    - [6.2 VnPay Webhook (API-02)](#62-vnpay-webhook-api-02)
    - [6.3 SePay Webhook (API-03)](#63-sepay-webhook-api-03)
- [III. Requirement Appendix](#iii-requirement-appendix)
  - [1. Business Rules](#1-business-rules)
  - [2. System Messages](#2-system-messages)
  - [3. Other Requirements](#3-other-requirements)

# I. Overall Requirements

## 1. Context Diagram

![Context Diagram](images/01_context_diagram.png)

## 2. Main Business Flow

### 2.1 Citizen send Hot News & Complaint intake

![Citizen Hot News and Complaint Intake Workflow](images/02_citizen_hot_news_complaint_intake.png)

### 2.2 Expert/Researcher Contributor

[![Expert Researcher Contributor Workflow](images/03_expert_researcher_contributor.png)](https://drive.google.com/file/d/1Z7jNUIVwfsFTTGXCMKEUJ--rYqpJd9Vt/view?usp=sharing)

### 2.3 Contributor Registration Process

![Contributor Registration Process](images/04_contributor_registration.png)

### 2.4 Penalty / Violation Handling Workflow 

![Penalty and Violation Handling Workflow](images/05_penalty_violation_handling.png)

### 2.5 Assign Contributor

![Assign Contributor Workflow](images/06_assign_contributor.png)


## 3. Conceptual Data Model

### 3.1 Entity Relationship Diagram

[*<u>LINK</u>*](https://drive.google.com/file/d/1j-SeC3Qo0uJAWktLir0BTWTAn6-vGl6E/view?usp=sharing)

![Entity Relationship Diagram](images/07_entity_relationship_diagram.png)

### 3.2 Entity Descriptions

**Entity: User**

| **Field**              | **Type**     | **Value**                                                                                               |
|------------------------|--------------|---------------------------------------------------------------------------------------------------------|
| id                     | VARCHAR(10)  | Mã định danh duy nhất của người dùng (gồm 2 chữ cái và 4 số, ví dụ: HE1941).                            |
| role                   | VARCHAR(30)  | Vai trò hệ thống: CITIZEN, CONTRIBUTOR, EXPERT, EDITOR, DEPUTY_EIC, EIC, SYSTEM_ADMIN.                  |
| full_name              | VARCHAR(255) | Họ và tên đầy đủ của người dùng.                                                                        |
| email                  | VARCHAR(255) | Địa chỉ email dùng để đăng nhập chính và nhận thông báo.                                                |
| phone                  | VARCHAR(20)  | Số điện thoại dùng để liên lạc hoặc nhận SMS OTP.                                                       |
| password_hash          | VARCHAR(255) | Mật khẩu mã hóa bảo mật (Bcrypt/Argon2).                                                                |
| status                 | VARCHAR(30)  | Trạng thái tài khoản: PENDING_OTP, ACTIVE, LOCKED (bị khóa do vi phạm hoặc do Phó TBT/Admin xử phạt).   |
| is_verified            | BOOLEAN      | Trạng thái xác thực tài khoản qua EKYC/OTP.                                                             |
| expertise_fields       | TEXT         | Lĩnh vực chuyên môn của CTV/Chuyên gia (Kinh tế, Môi trường,...; để NULL nếu là Citizen).               |
| credentials_file_data  | LONGBLOB     | Dữ liệu nhị phân chứa gói tài liệu, ảnh thẻ nhà báo/CCCD hoặc file Microsoft 365 Word, Excel, PPT, PDF. |
| credentials_files_meta | JSON         | Danh sách metadata (tên tệp, mime_type, file_size) do hệ thống tự trích xuất khi nộp hồ sơ.             |
| upgrade_status         | VARCHAR(30)  | Trạng thái xét duyệt nâng cấp: NONE, PENDING, APPROVED, REJECTED.                                       |
| reputation_score       | INT          | Điểm tín nhiệm cache hiện tại (mặc định 50 cho Citizen, 100 cho CTV).                                   |

**Entity: Categories**

| **Field**     | **Value**                                                                                                       |
|---------------|-----------------------------------------------------------------------------------------------------------------|
| id            | Số nguyên tự tăng (INT, PK); định danh duy nhất cho từng chuyên mục/lĩnh vực                                    |
| name          | Tên chuyên mục hiển thị (Kinh tế, Chính trị - Xã hội, Pháp luật, Đời sống, Khoa học - Môi trường).              |
| slug          | Chuỗi ký tự chuẩn hóa duy nhất (VARCHAR, UNIQUE); định danh chuyên mục trên đường dẫn.                          |
| deputy_eic_id | Khóa ngoại (FK -\> users.id, UNIQUE, NULL); chỉ định đích danh đúng 1 Phó Tổng biên tập phụ trách lĩnh vực này. |
| is_active     | Giá trị boolean (TRUE: chuyên mục đang mở nhận bài; FALSE: tạm dừng tiếp nhận).                                 |

**Entity: Submissions**

<table>
<colgroup>
<col style="width: 18%" />
<col style="width: 81%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Field</strong></th>
<th><strong>Value</strong></th>
</tr>
<tr class="odd">
<th>id</th>
<th>Số nguyên lớn tự tăng (BIGINT, PK); định danh duy nhất cho từng bản ghi tin/bài.</th>
</tr>
<tr class="header">
<th>type</th>
<th>Phân loại hình thức nội dung: HOT_NEWS (Tin nóng), COMPLAINT (Khiếu nại/Phản ánh), CONTRIBUTOR_POST (Bài viết CTV tại hiện trường), RESEARCH_PAPER (Bài nghiên cứu Chuyên gia).</th>
</tr>
<tr class="odd">
<th>category_id</th>
<th>Khóa ngoại (FK -&gt; categories.id, NULL); chuyên mục/lĩnh vực được BTV gán sau khi sàng lọc để điều tuyến bài đến đúng Phó TBT phụ trách.</th>
</tr>
<tr class="header">
<th>author_id</th>
<th>Khóa ngoại (FK -&gt; users.id); tài khoản người gửi tin/bài (để phản hồi, trả nhuận bút hoặc truy vết).</th>
</tr>
<tr class="odd">
<th>assigned_editor_id</th>
<th>Khóa ngoại (FK -&gt; users.id, NULL); Biên tập viên được phân công trực tiếp thụ lý bài viết.</th>
</tr>
<tr class="header">
<th>title</th>
<th>Chuỗi văn bản tiêu đề của tin nóng, đơn phản ánh hoặc bài viết.</th>
</tr>
<tr class="odd">
<th>content</th>
<th>Toàn văn nội dung bài/tin (LONGTEXT).</th>
</tr>
<tr class="header">
<th>is_anonymous</th>
<th>Giá trị boolean (TRUE: nộp ẩn danh; FALSE: công khai danh tính).</th>
</tr>
<tr class="odd">
<th>status</th>
<th><p>Chu trình trạng thái nghiệp vụ:</p>
<p>• Tiếp nhận: PENDING, CANCELLED</p>
<p>• Biên tập: IN_REVIEW, NEED_MORE_INFO, REJECTED</p>
<p>• Duyệt chuyên môn (Phó TBT): DEPUTY_PENDING, DEPUTY_REJECTED</p>
<p>• Ban biên tập (Tổng biên tập): EIC_PENDING, EIC_REJECTED, READY_FOR_PUBLISHING, PUBLISHED (Áp dụng đối với tin tức mức độ nghiêm trọng/Breaking)</p>
<p>• Hậu kiểm: CORRECTED, RETRACTED</p></th>
</tr>
<tr class="header">
<th>priority</th>
<th>Mức độ ưu tiên xử lý: LOW, MEDIUM, HIGH, BREAKING.</th>
</tr>
<tr class="odd">
<th>impact_score</th>
<th>Điểm số tác động xã hội do BTV thẩm định dựa trên khu vực, số người và loại vấn đề (mặc định 0).</th>
</tr>
<tr class="header">
<th>is_spam</th>
<th>Giá trị boolean (kết quả quét AI; TRUE: nghi vấn thư rác/quảng cáo, FALSE: nội dung hợp lệ).</th>
</tr>
<tr class="odd">
<th>ai_summary</th>
<th>Đoạn văn bản tóm tắt nội dung cốt lõi do AI tự động trích xuất (TEXT, NULL).</th>
</tr>
<tr class="header">
<th>duplicate_submission_id</th>
<th>Khóa ngoại tự tham chiếu (FK -&gt; submissions.id, NULL); trỏ tới ID bài viết gốc đã có nếu AI/BTV phát hiện sự kiện bị gửi trùng lặp để phục vụ gộp tin.</th>
</tr>
<tr class="odd">
<th>is_revealed</th>
<th>Giá trị boolean (mặc định FALSE); ghi nhận Tổng biên tập đã giải mật danh tính bài ẩn danh này hay chưa.</th>
</tr>
<tr class="header">
<th>reveal_reason</th>
<th>Căn cứ/lý do bắt buộc phải tra cứu tác giả bài viết ẩn danh do Tổng biên tập nhập (TEXT, NULL).</th>
</tr>
<tr class="odd">
<th>created_at</th>
<th>Mốc thời gian (DATETIME); thời điểm gửi tin vào hệ thống.</th>
</tr>
<tr class="header">
<th>updated_at</th>
<th>Mốc thời gian (DATETIME); thời điểm có thay đổi nội dung hoặc trạng thái.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

**Entities: Evidences**

*\[Add one block per additional entity following the same structure.\]*

| **Field**     | **Value**                                                                          |
|---------------|------------------------------------------------------------------------------------|
| id            | Số nguyên lớn tự tăng (BIGINT, PK); định danh duy nhất cho tệp tư liệu/bằng chứng. |
| submission_id | Khóa ngoại (FK -\> submissions.id, NULL); gắn tệp tư liệu vào bài viết tương ứng.  |
| uploaded_by   | Khóa ngoại (FK -\> users.id); tài khoản của người gửi tư liệu lên hệ thống.        |
| file_url      | Đường dẫn lưu trữ tệp tin trên dịch vụ lưu trữ số (Cloud / S3 Storage).            |
| file_type     | Phân loại tệp: IMAGE, VIDEO, AUDIO, DOCUMENT.                                      |
| source_ref    | Chuỗi văn bản/URL chứa nguồn tài liệu trích dẫn tham chiếu (dành cho Chuyên gia).  |
| created_at    | Mốc thời gian (DATETIME); thời điểm tải tệp tư liệu thành công.                    |


**Entities: Field_assignments**

| **Field**            | **Value**                                                                                                                                                                   |
|----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| id                   | Số nguyên lớn tự tăng (BIGINT, PK); định danh duy nhất cho nhiệm vụ tác nghiệp hiện trường.                                                                                 |
| submission_id        | Khóa ngoại (FK -\> submissions.id, NULL); nguồn tin nóng/khiếu nại ban đầu cần điều tra xác minh.                                                                           |
| created_by           | Khóa ngoại (FK -\> users.id); Biên tập viên ra lệnh điều phối nhiệm vụ.                                                                                                     |
| title                | Chuỗi văn bản tóm tắt nội dung nhiệm vụ được giao tác nghiệp tại hiện trường.                                                                                               |
| assignment_mode      | Hình thức giao việc: BROADCAST (gửi mở cho toàn bộ mạng lưới CTV tranh nhận) hoặc DIRECT (BTV chọn đích danh một CTV do tính chất đặc biệt).                                |
| contributor_id       | Khóa ngoại (FK -\> users.id, NULL); CTV nhận nhiệm vụ tác nghiệp (để NULL khi mới tạo dạng BROADCAST, chỉ điền ID khi BTV giao thẳng hoặc khi có CTV bấm nhận).             |
| claimed_at           | Mốc thời gian (DATETIME, NULL); thời điểm CTV đầu tiên xác nhận nhận lệnh (xử lý cơ chế First-come-first-served, khóa tranh chấp).                                          |
| output_submission_id | Khóa ngoại (FK -\> submissions.id, NULL); trỏ tới bài viết hoàn chỉnh (loại CONTRIBUTOR_POST) mà CTV nộp về sau khi tác nghiệp.                                             |
| status               | Vòng đời nhiệm vụ: OPEN (đang mở chờ CTV nhận), ASSIGNED (đã giao chỉ định), ACCEPTED (CTV đã nhận việc), CANCELLED (hủy nhiệm vụ), COMPLETED (đã hoàn thành nộp sản phẩm). |
| deadline             | Mốc thời gian (DATETIME, NULL); hạn chót CTV phải hoàn thành và nộp tư liệu về.                                                                                             |
| created_at           | Mốc thời gian (DATETIME); thời điểm tạo nhiệm vụ.                                                                                                                           |
| updated_at           | Mốc thời gian (DATETIME); thời điểm cập nhật trạng thái hoặc người nhận việc.                                                                                               |


**Entities: editorial_reviews**

| **Field**        | **Value**                                                                                                                                                                                                                           |
|------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| id               | Số nguyên lớn tự tăng (BIGINT, PK); định danh một lượt đánh giá/phản hồi trong luồng kiểm duyệt.                                                                                                                                    |
| submission_id    | Khóa ngoại (FK -\> submissions.id); bài viết nhận ý kiến thẩm duyệt.                                                                                                                                                                |
| reviewer_id      | Khóa ngoại (FK -\> users.id); người tiến hành kiểm duyệt.                                                                                                                                                                           |
| review_role      | Vai trò người kiểm duyệt tại thời điểm thao tác: EDITOR, DEPUTY_EIC, EIC.                                                                                                                                                           |
| action           | Quyết định đưa ra: REQUEST_INFO (yêu cầu bổ sung chứng cứ), APPROVE (duyệt thông qua), REJECT (từ chối), REQUEST_EDIT (yêu cầu sửa văn bản), ESCALATE (Phó TBT chuyển tiếp lên TBT khi gặp tin High/Breaking), RETRACT (gỡ bỏ bài). |
| comments         | Ghi chú ý kiến chuyên môn, lý do từ chối, giải trình hoặc chỉ đạo (TEXT).                                                                                                                                                           |
| content_snapshot | Bản chụp nội dung văn bản (LONGTEXT, NULL); lưu nguyên văn tiêu đề/nội dung tại thời điểm BTV sửa bài hoặc khi TBT gỡ bài phục vụ đối soát, thanh tra.                                                                              |
| created_at       | Mốc thời gian (DATETIME); thời điểm tạo ghi chú kiểm duyệt.                                                                                                                                                                         |


**Entities: Reputation_logs**

| **Field**             | **Value**                                                                                                                                                            |
|-----------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| id                    | Số nguyên lớn tự tăng (BIGINT, PK); định danh duy nhất cho mỗi lượt biến động điểm uy tín.                                                                           |
| user_id               | Khóa ngoại (FK -\> users.id); xác định CTV/Chuyên gia/Citizen bị tăng hoặc trừ điểm.                                                                                 |
| points_change         | Số nguyên (dương khi thưởng điểm, âm khi xử phạt vi phạm).                                                                                                           |
| reason                | Mã định danh lý do: INITIAL_CONTRIBUTOR_ONBOARDING, SUBMISSION_APPROVED, TASK_COMPLETED_ON_TIME, TASK_LATE, INACCURATE_EVIDENCE, SPAM_REPORTED, COPYRIGHT_VIOLATION. |
| related_submission_id | Khóa ngoại (FK -\> submissions.id, NULL); trỏ tới bài viết hoặc vụ việc cụ thể là nguyên nhân dẫn đến việc cộng/trừ điểm.                                            |
| created_at            | Mốc thời gian (DATETIME); thời điểm ghi nhận biến động điểm.                                                                                                         |


### 3.3 Data Business Rules

| **Rule**                                 | **Description**                                                                                                             | **Enforced On**                      |
|------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|--------------------------------------|
| Unique username                          | No two users may share the same username, regardless of role.                                                               | Account creation and username change |
| Unique email                             | No two users may share the same email address.                                                                              | Account creation and email change    |
| One application per job                  | A Candidate may not submit a second Application for a job they have already applied to, even if the previous was withdrawn. | Application submission               |
| Application requires active job          | A Candidate may only apply for a Job Posting with status Active.                                                            | Application submission               |
| Accounts never permanently deleted       | User accounts are deactivated, not deleted. All associated data must remain accessible.                                     | Account deactivation                 |
| Jobs with applications cannot be deleted | A Job Posting with at least one Application (any status) cannot be deleted — must be Closed instead.                        | Job deletion                         |
| Internal notes are permanent             | Once saved, an Internal Note cannot be edited or deleted by anyone. They form an audit trail.                               | Note creation                        |
| Evaluations are permanent                | Once an Interviewer submits rating and feedback, neither can be changed by anyone.                                          | Evaluation submission                |
| CV files are access-controlled           | CV files must never be accessible via a guessable or publicly shareable link. Access verified by system on every download.  | CV file access                       |

## 4. User Requirements

### 4.1 Actors

<table>
<colgroup>
<col style="width: 4%" />
<col style="width: 19%" />
<col style="width: 76%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>#</strong></th>
<th><strong>Actor</strong></th>
<th><strong>Description</strong></th>
</tr>
<tr class="odd">
<th><blockquote>
<p>1</p>
</blockquote></th>
<th>Citizen</th>
<th>Submit breaking news, complaints/petitions, and information or evidence to the newsroom system.</th>
</tr>
<tr class="header">
<th><blockquote>
<p>2</p>
</blockquote></th>
<th>Contributor</th>
<th>Collect and provide first-hand evidence, raw media, field reports, and articles; revise content based on Editor feedback.</th>
</tr>
<tr class="odd">
<th><blockquote>
<p>3</p>
</blockquote></th>
<th>Expert / Researcher</th>
<th>Submit research/analysis papers and professional materials; declare conflicts of interest.</th>
</tr>
<tr class="header">
<th><blockquote>
<p>4</p>
</blockquote></th>
<th>Editor</th>
<th>Screen and classify submissions, request additional information, coordinate verification, edit content, and submit content for approval.</th>
</tr>
<tr class="odd">
<th><blockquote>
<p>5</p>
</blockquote></th>
<th>Verifier</th>
<th>Perform official verification of claims, sources, evidence, and media; cross-check information and create Verification Reports.</th>
</tr>
<tr class="header">
<th><blockquote>
<p>6</p>
</blockquote></th>
<th>Editor-in-Chief (EIC)</th>
<th>Approve important, sensitive, or breaking content and handle corrections or retractions after publication.</th>
</tr>
<tr class="odd">
<th><blockquote>
<p>7</p>
</blockquote></th>
<th>Business Admin</th>
<th>Manage business configurations, submission types, categories, Impact Score, priority levels, Contributor criteria, and related business rules</th>
</tr>
<tr class="header">
<th><blockquote>
<p>8</p>
</blockquote></th>
<th>System Admin</th>
<th>Manage user accounts, roles, permissions, system configuration, workflow, integrations, notifications, and audit logs.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### 4.2 Use Cases (UC)

#### 4.2.1 UCs for Guest

| **ID** | **Use Case**     | **Feature**    | **Use Case Description**                                                                         |
|--------|------------------|----------------|--------------------------------------------------------------------------------------------------|
| 01     | View Home page   | Navigation     | Allowed Guest view homepage                                                                      |
| 02     | Log In           | Authentication | Allows a guest to authenticate with registered credentials to access role-based system features. |
| 03     | Register Account | Authentication | Allows a guest to submit required personal details to create a new user account in the system.   |


#### 4.2.2 UCs for Expert / Researcher


| **ID** | **Use Case**                   | **Feature**            | **Use Case Description**                                                                                                            |
|--------|--------------------------------|------------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| 01     | Register Account               | Authentication         | Allow the ***Expert*** to create an account to access the system.                                                                   |
| 02     | Log In                         | Authentication         | Authenticate the ***Expert*** and grant access to the system.                                                                       |
| 03     | Verify Account (OTP)           | Authentication         | Verify the ***Expert*** account using an OTP code.                                                                                  |
| 04     | Submit Breaking News           | Submission             | Allow the ***Expert*** to submit information about a breaking news event to the newsroom.                                           |
| 05     | Submit Complaint               | Submission             | Allow the Expert to submit a complain, feedback, or report to the newsroom                                                          |
| 06     | Submit Anonymously             | Privacy                | Allow the ***Expert*** to submit information while protecting their identity. ( Only submit when sends breaking news or Complaint ) |
| 07     | Attach Supporting Materials    | Submission             | Allow the ***Expert*** to attach relevant photos, videos, audio files, or documents.                                                |
| 08     | Cancel Pending Submission      | Submission Management  | Allow the ***Expert*** to cancel a submission while it is in Pending status.                                                        |
| 09     | Track Submission Status        | Submission Management  | Allow the ***Expert*** to track the processing status of submitted information.                                                     |
| 10     | Provide Additional Information | Submission Management  | Allow the ***Expert*** to provide additional information or evidence when requested by the Editor.                                  |
| 11     | Write article                  | Submission             | Allow the ***Expert** write article about fields*                                                                                   |
| 12     | Verify user authentic          | Authentication         | Allow the Expert verify user authentic by EKYC                                                                                      |
| 13     | Register as a Contributor      | Contributor Management | Allow an eligible user to submit an application to become a Contributor.                                                            |
| 14     | Track Contributor Application  | Contributor Management | Allow the Citizen to track the processing status of the Contributor application.                                                    |
| 15     | Update Profile                 | Profile Management     | Allow the Citizen to update their profile information.                                                                              |


#### 4.2.3 UCs for System Admin


| **ID** | **Use Case**                | **Feature**           | **Use Case Description**                                                                                                                                |
|--------|-----------------------------|-----------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
| 01     | Log in                      | Authentication        | Authenticate the System Admin and grant access to the technical administration system.                                                                  |
| 02     | Logout                      | Authentication        | End the current administrative session and revoke active sessions when required.                                                                        |
| 03     | Change Admin Password       | Account Management    | Allow the System Admin to change their account password. The new password must comply with administrative security policies.                            |
| 04     | Manage User Accounts        | User Management       | Create, suspend, reactivate, lock, unlock, or reset user accounts across the system.                                                                    |
| 05     | Provision Internal Accounts | Account Management    | Create and initialize accounts for authorized newsroom personnel. These may include Editor, EIC, and System Admin.                                      |
| 06     | Update User Role            | Account Management    | Allow the System Admin to change an approved user's role from CITIZEN to CONTRIBUTOR. The role change must be authorized and recorded in the audit log. |
| 07     | View & Export Audit Logs    | Security & Audit      | View, filter, and export records of important system and administrative activities.                                                                     |
| 08     | Manage Categories           | Content Configuration | Create, update, organize, or disable news categories and topical domains.                                                                               |


#### 4.2.4 UCs for EIC

| **ID** | **Use Case**                                  | **Feature**                  | **Use Case Description**                                                                                                                                          |
|--------|-----------------------------------------------|------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1      | Log in                                        | Authentication               | Allow the Editor-in-Chief to access the internal newsroom system using an authorized account.                                                                     |
| 2      | View Pending Approval                         | Approval Management          | Allow the Editor-in-Chief to view articles and submissions that are waiting for final editorial approval.                                                         |
| 3      | Review Important / Sensitive Content          | Editorial Approval           | Allow the Editor-in-Chief to review important, sensitive, or breaking content, including the article, supporting evidence, sources, and verification results.     |
| 4      | Review Verification Result                    | Verification Management      | Allow the Editor-in-Chief to review the Verification Report and verification result before making the final approval decision.                                    |
| 5      | Approve Content                               | Approval Management          | Allow the Editor-in-Chief to approve content that meets the editorial, verification, and legal requirements.                                                      |
| 6      | Request Revision                              | Editorial Approval           | Allow the Editor-in-Chief to request revisions or additional information when the submitted content does not meet the required standards.                         |
| 7      | Mark Ready for Publishing                     | Publication Workflow         | Allow the Editor-in-Chief to move approved content to the **READY_FOR_PUBLISHING** status.                                                                        |
| 8      | Review AI Disclosure / Content Origin         | AI Governance                | Allow the Editor-in-Chief to review whether AI was used to assist, generate, or modify the content and ensure that the AI usage information is properly recorded. |
| 9      | Handle Correction                             | Post-Publication Management  | Allow the Editor-in-Chief to review and approve corrections to published content when errors or inaccurate information are identified.                            |
| 10     | Review Account Violation Report               | User Reputation & Compliance | Allow the Editor-in-Chief to check and evaluate serious violation reports of Citizen/CTV accounts sent by Editors                                                 |
| 11     | Approve Account Unlocking / Retraction Policy | User Reputation & Compliance | Allow the Editor-in-Chief (or Deputy EIC) to review and give final authorization for unlocking severely restricted accounts or handling major appeals.            |

#### 4.2.5. UCs for Contributor


| **ID** | **Use Case**                          | **Feature**             | **Use Case Description**                                                                                                                              |
|--------|---------------------------------------|-------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| 01     | Log In                                | Authentication          | Allow the Contributor to access the system using their Contributor account.                                                                           |
| 02     | Submit Evidence                       | Field Reporting         | Allow the Contributor to collect first-hand evidence, including photos, videos, audio recordings, interviews, GPS, timestamps, and related documents. |
| 03     | Write and Submit Field Report         | Content Submission      | Allow the Contributor to write a news article or field report during fieldwork and submit it to the newsroom.                                         |
| 04     | Accept Evidence Collection Assignment | Assignment Management   | Allow the Contributor to accept an assigned evidence collection task.                                                                                 |
| 05     | Cancel Evidence Collection Assignment | Assignment Management   | Allow the Contributor to cancel an assigned evidence collection task.                                                                                 |
| 06     | Track Article Status                  | Article Management      | Allow the Contributor to track the processing status of submitted articles.                                                                           |
| 07     | View Editor Feedback                  | Editorial Collaboration | Allow the Contributor to view feedback and revision requests from the Editor.                                                                         |
| 08     | Edit Article                          | Article Management      | Allow the Contributor to revise an article based on Editor feedback.                                                                                  |
| 09     | Submit Additional Evidence            | Verification            | Allow the Contributor to provide additional media or evidence when requested by the Editor.                                                           |
| 10     | View Contribution History             | Contribution Management | Allow the Contributor to view their previous submitted articles, reports, and contribution history.                                                   |


#### 4.2.6. UCs for Citizen


| **ID** | **Use Case**                   | **Feature**            | **Use Case Description**                                                                      |
|--------|--------------------------------|------------------------|-----------------------------------------------------------------------------------------------|
| 01     | Register Account               | Authentication         | Allow the Citizen to create an account to access the system.                                  |
| 02     | Log In                         | Authentication         | Authenticate the Citizen and grant access to the system.                                      |
| 03     | Verify Account (OTP)           | Authentication         | Verify the Citizen's account using an OTP code.                                               |
| 04     | Submit Breaking News           | Submission             | Allow the Citizen to submit information about a breaking news event to the newsroom.          |
| 05     | Submit Complaint or Feedback   | Submission             | Allow the Citizen to submit a complaint, feedback, or report to the newsroom.                 |
| 06     | Submit Anonymously             | Privacy                | Allow the Citizen to submit information while protecting their identity.                      |
| 07     | Attach Supporting Materials    | Submission             | Allow the Citizen to attach relevant photos, videos, audio files, or documents.               |
| 08     | Verify user authentic          | Authentication         | Allow the Expert verify user authentic by EKYC                                                |
| 09     | Cancel Pending Submission      | Submission Management  | Allow the Citizen to cancel a submission while it is in Pending status.                       |
| 10     | Track Submission Status        | Submission Management  | Allow the Citizen to track the processing status of submitted information.                    |
| 11     | Provide Additional Information | Submission Management  | Allow the Citizen to provide additional information or evidence when requested by the Editor. |
| 12     | Register as a Contributor      | Contributor Management | Allow an eligible Citizen to submit an application to become a Contributor.                   |
| 13     | Track Contributor Application  | Contributor Management | Allow the Citizen to track the processing status of the Contributor application.              |
| 14     | Update Profile                 | Profile Management     | Allow the Citizen to update their profile information.                                        |
| 15     | Redeem Point                   | Point Management       | Allow user to exchange accumulated contribution points for rewards                            |

#### 4.2.7 UCs for Editor


| **ID** | **Use Case**                   | **Feature**       | **Use Case Description**                                                                                                   |
|--------|--------------------------------|-------------------|----------------------------------------------------------------------------------------------------------------------------|
| 01     | Log in                         | Authentication    | Log in to the internal system using an account provided by the System Admin.                                               |
| 02     | View Submission Queue          | Content Screening | View new news, articles, or complaint forms submitted to the system.                                                       |
| 03     | View AI Screening Results      | Content Screening | View spam flags, duplicate checks, content classification, AI summary, and risk indicators.                                |
| 04     | Reject Spam                    | Content Screening | Directly reject spam or inappropriate content.                                                                             |
| 05     | Check for Duplication          | Content Screening | Evaluate similar or duplicate content based on AI recommendations.                                                         |
| 06     | Assess Impact Score            | Content Screening | Adjusting the scoring criteria                                                                                             |
| 07     | Request Additional Information | Verification      | Request the Citizen, Contributor, or Expert to provide supplementary evidence or information.                              |
| 08     | Review Citizen Upgrade Request | User Management   | Review the profile of a Citizen requesting to upgrade to a Contributor before forwarding it to the Deputy Editor-in-Chief. |
| 09     | Evaluate User Performance      | User Management   | Check the reputation score of Citizens and the performance score of Contributors.                                          |
| 10     | Handle User Violations         | User Management   | Send warnings, apply penalties (reduce points, assign fewer jobs), flag accounts, or lock accounts for serious violations. |
| 11     | Edit Article                   | Content Editing   | Edit the content, structure, and title of the submitted article.                                                           |
| 12     | Assign Field Verification      | Verification      | Allow the Editor to assign a field verification task to a Contributor.                                                     |
| 13     | Audit Revision History         | Content Editing   | Allow the Editor to review article revision history.                                                                       |


#### 4.2.8 Deputy Editor-in-Chief 


| **ID** | **Use Case**                          | **Feature**                  | **Use Case Description**                                                                                           |
|--------|---------------------------------------|------------------------------|--------------------------------------------------------------------------------------------------------------------|
| 01     | Log In                                | Authentication               | Log in to the internal newsroom system using an authorized Deputy Editor-in-Chief account.                         |
| 02     | View Editorial Pipeline               | Editorial Management         | Monitor the progress of all submissions, screening queues, and verification tasks across desks.                    |
| 03     |                                       |                              |                                                                                                                    |
| 04     | Preliminary Review of Content         | Editorial Approval           | Perform a preliminary review of edited articles, verification reports, and AI flags before forwarding to the EIC.  |
| 05     | Approve Routine Submissions           | Editorial Approval           | Give intermediate or final editorial approval for standard, non-sensitive content delegated by the EIC.            |
| 06     | Request Revision from Editor          | Editorial Workflow           | Send articles back to the assigned Editor with specific revision notes regarding quality, accuracy, or formatting. |
| 07     | Approve Braking News                  | Editorial Escalation         | Approve the report from Editor and Pass to EIC to allow publish                                                    |
| 08     | Approve Citizen Upgrade Request       | User Management              | Review and officially approve or reject upgrade requests from Citizens to Contributors forwarded by Editors.       |
| 09     | Manage Contributor Contracts & Badges | User Management              | Issue, suspend, or renew official verification badges and task allowances for active Contributors.                 |
| 10     | Review Account Penalty Appeals        | User Reputation & Compliance | Review appeals submitted by penalized or flagged users, approving relief or escalating severe bans to the EIC.     |
| 11     | Monitor Editorial Deadlines & SLAs    | Operations Monitoring        | Track publishing timelines, overdue field verifications, and editorial bottlenecks to ensure timely publication.   |


### 4.3 Use Case Diagrams

#### 4.3.1 UCs Citizen

![Citizen Use Case Diagram](images/08_use_case_citizen.png)

#### 4.3.2 UCs Contributor

![Contributor Use Case Diagram](images/09_use_case_contributor.png)


#### 4.3.3 UCs Editor

[![Editor Use Case Diagram](images/10_use_case_editor.png)](https://drive.google.com/file/d/10dR7PI4MbaB3MnuhkwsMqmQIsUI00zS-/view?usp=sharing)

#### 4.3.4 UCs for EIC

![Editor in Chief Use Case Diagram](images/11_use_case_eic.png)

#### 4.3.5 UCs For Expert

![Expert Use Case Diagram](images/12_use_case_expert.png)

#### 4.3.6 UCs For System Admin

![System Admin Use Case Diagram](images/13_use_case_system_admin.jpg)

### 4.4 Permission Matrix

Full = unrestricted · Restricted = conditions apply (see footnotes) · No = denied

| **Entity**    | **Action**         | **Admin** | **HR Manager** | **Interviewer** | **Candidate** | **Guest** |
|---------------|--------------------|-----------|----------------|-----------------|---------------|-----------|
| User account  | Create             | Full      | No             | No              | No            | No        |
| User account  | Edit / Deactivate  | Full      | No             | No              | No            | No        |
| User account  | Unlock             | Full      | No             | No              | No            | No        |
| Job posting   | Create             | Full      | Full           | No              | No            | No        |
| Job posting   | Edit               | Full      | Full           | No              | No            | No        |
| Job posting   | Delete             | Full      | Full           | No              | No            | No        |
| Job posting   | Change status      | Full      | Full           | No              | No            | No        |
| Job posting   | View (Active only) | Full      | Full           | Full            | Full          | Full      |
| Application   | Submit             | No        | No             | No              | Full          | No        |
| Application   | View own           | No        | No             | No              | Full          | No        |
| Application   | View all (per job) | Full      | Full           | Restricted ¹    | No            | No        |
| Application   | Update status      | Full      | Full           | No              | No            | No        |
| Application   | Withdraw           | No        | No             | No              | Full          | No        |
| Internal note | Create / View      | Full      | Full           | No              | No            | No        |
| Interview     | Schedule / Assign  | Full      | Full           | No              | No            | No        |
| Interview     | Submit evaluation  | Full      | Full           | Full            | No            | No        |
| Dashboard     | View               | Full      | Full           | No              | No            | No        |

## 5. System Functionalities

### 5.1 Screen Inventory

#### a. Screen Flow

![System Screen Flow Diagram](images/14_system_screen_flow.png)

#### b. Screen List

| **\#** | **Screen Name**                   | **Feature**             | **Description**                                                                                                              |
|--------|-----------------------------------|-------------------------|------------------------------------------------------------------------------------------------------------------------------|
| 1      | Home Page                         | Navigation              | Allows any guest or authenticated user to view portal announcements, tracking shortcuts, and published articles.             |
| 2      | Login                             | Authentication          | Allows any registered user to authenticate with credentials and access their role-specific desk.                             |
| 3      | Sign Up                           | Authentication          | Allows a new public user to register an account with basic credentials (default CITIZEN role).                               |
| 4      | Forgot Password                   | Authentication          | Allows a user to submit their registered email or phone number to initiate credential recovery.                              |
| 5      | Input OTP                         | Authentication          | Allows a user to input a one-time verification code to verify their account or confirm a password reset.                     |
| 6      | View Profile (Citizen)            | Profile Management      | Allows the Citizen to review their account credentials, identity verification status, and contribution score.                |
| 7      | Edit Profile (Citizen)            | Profile Management      | Allows the Citizen to update their personal contact details and communication preferences.                                   |
| 8      | Send Breaking News                | Content Submission      | Allows the Citizen to submit breaking incident information, location data, and initial media files.                          |
| 9      | Send Complaint                    | Content Submission      | Allows the Citizen to submit civil petitions, feedback, or complaints with supporting evidence.                              |
| 10     | Follow Status (Citizen)           | Submission Tracking     | Allows the Citizen to track real-time editorial progress and lifecycle statuses of their submitted reports.                  |
| 11     | Additional Info Form              | Submission Management   | Allows the Citizen to provide supplementary explanations or evidence files requested by the newsroom.                        |
| 12     | Upgrade to CTV Form               | Contributor Management  | Allows an eligible Citizen to submit an application package with identification/press documents to upgrade to a Contributor. |
| 13     | Profile & Credentials (Expert)    | Profile Management      | Allows the Expert to view profile details, academic credentials, and upload verified degrees/certifications.                 |
| 14     | Submit Research Article           | Article Submission      | Allows the Expert to submit in-depth analytical/research papers along with conflict-of-interest declarations and citations.  |
| 15     | Follow Status (Expert)            | Article Management      | Allows the Expert to monitor editorial review stages and peer-review feedback on their submitted papers.                     |
| 16     | Peer Review Revision              | Article Management      | Allows the Expert to revise manuscripts and respond directly to editorial or peer-review notes.                              |
| 17     | Profile (Contributor)             | Profile Management      | Allows the Contributor to view personal credentials, active press badges, and reputation scores.                             |
| 18     | Edit Profile (Contributor)        | Profile Management      | Allows the Contributor to update their specialized beats, regions, and contact information.                                  |
| 19     | Task List                         | Assignment Management   | Allows the Contributor to browse available field tasks (broadcast) and direct assignments.                                   |
| 20     | Claim / Accept Task               | Assignment Management   | Allows the Contributor to accept and lock an assignment for field investigation under the first-come-first-served policy.    |
| 21     | Field Evidence (GPS)              | Field Reporting         | Allows the Contributor to upload raw images, videos, or audio recordings with extracted GPS coordinates and timestamps.      |
| 22     | Field Report & Article            | Field Reporting         | Allows the Contributor to compose on-site draft articles and submit field verification reports to the Editor.                |
| 23     | Profile (Editor)                  | Profile Management      | Allows the Editor to view their desk assignment, handled topics, and operational records.                                    |
| 24     | Edit Profile (Editor)             | Profile Management      | Allows the Editor to modify contact details and notification settings.                                                       |
| 25     | View Breaking News (Editor Queue) | Content Screening       | Allows the Editor to inspect incoming submissions, intake feeds, and pending news queues.                                    |
| 26     | AI Screening & Merge              | Content Screening       | Allows the Editor to review automated AI spam flags, risk indicators, summaries, and merge duplicate incident reports.       |
| 27     | Eval Impact Score                 | Editorial Evaluation    | Allows the Editor to evaluate human and geographical impact scores and classify priority levels (Low to Breaking).           |
| 28     | Dispatch CTV Task                 | Verification Management | Allows the Editor to dispatch field investigation tasks to Contributors via direct assign or regional broadcast.             |
| 29     | CMS Article Editor                | Content Editing         | Allows the Editor to edit headlines, sapo, formatted body text, attach media assets, and store version snapshots.            |
| 30     | Forward to Deputy EIC             | Editorial Routing       | Allows the Editor to route finalized drafts to the assigned Deputy Editor-in-Chief for topic-specific approval.              |
| 31     | Profile (Deputy EIC)              | Profile Management      | Allows the Deputy Editor-in-Chief to view their assigned editorial domain and executive credentials.                         |
| 32     | Edit Profile (Deputy EIC)         | Profile Management      | Allows the Deputy Editor-in-Chief to update personal information and preferences.                                            |
| 33     | View Category Queue               | Editorial Approval      | Allows the Deputy Editor-in-Chief to view and manage editorial pipelines specifically assigned to their domain.              |
| 34     | Review GPS & Evidences            | Editorial Verification  | Allows the Deputy Editor-in-Chief to inspect field reports, GPS metadata, witness quotes, and proof bundles.                 |
| 35     | Approve Low/Med                   | Editorial Approval      | Allows the Deputy Editor-in-Chief to grant final publishing clearance for standard Low/Medium priority articles.             |
| 36     | Escalate to EIC                   | Editorial Escalation    | Allows the Deputy Editor-in-Chief to forward sensitive, high-impact, or Breaking news to the Editor-in-Chief.                |
| 37     | Profile (EIC)                     | Profile Management      | Allows the Editor-in-Chief to view executive credentials and authority settings.                                             |
| 38     | Edit Profile (EIC)                | Profile Management      | Allows the Editor-in-Chief to update personal profile details.                                                               |
| 39     | View Breaking News (EIC Queue)    | Executive Approval      | Allows the Editor-in-Chief to inspect urgent Breaking items and critical editorial packages awaiting clearance.              |
| 40     | Unmask Source (OTP)               | Privacy & Security      | Allows the Editor-in-Chief to unmask anonymous sources by providing a valid 2FA OTP code and legal justification.            |
| 41     | Retraction / Correction           | Crisis Management       | Allows the Editor-in-Chief to issue public correction notices or formally retract published articles.                        |
| 42     | Admin Dashboard                   | System Administration   | Allows the System Administrator to monitor server health, system metrics, and technical configurations.                      |
| 43     | User & RBAC Matrix                | Access Control          | Allows the System Administrator to manage user accounts, toggle statuses, and configure role-based permissions.              |
| 44     | Categories & Settings             | Master Data             | Allows the System Administrator to configure news categories, topical desks, and domain allocation rules.                    |
| 45     | Audit Log Viewer                  | Security & Audit        | Allows the System Administrator to inspect, search, filter, and export immutable system activity trails.                     |

### 5.2 External API Inventory

| **\#** | **API Name**                  | **Calling Path**                               | **Description**                                                                                                                                                 |
|--------|-------------------------------|------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1      | AI Screening & Triage Service | Newsroom Core --\> AI Engine                   | Sends incoming submission content to an external AI microservice to detect spam, calculate risk scores, generate text summaries, and flag potential duplicates. |
| 2      | S3 Object Storage API         | Newsroom Core --\> Cloud Storage (AWS S3)      | Uploads, stores, and securely serves raw multimedia evidence files (photos, videos, audio, documents) with metadata preservation.                               |
| 3      | SMS / Email OTP Gateway       | Newsroom Core --\> Twilio / SMTP Gateway       | Dispatches one-time verification tokens (OTP) for citizen account registration, password resets, and EIC 2FA source-unmasking authorizations.                   |
| 4      | Maps & Geocoding API          | Newsroom Core --\> Google Maps / OpenStreetMap | Reverse geocodes EXIF GPS coordinates extracted from field evidence into administrative addresses (ward, district, province).                                   |

### 5.3 Background Job Inventory

| **\#** | **Job Name**                        | **Group** | **Description**                                                                                                                                                     |
|--------|-------------------------------------|-----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1      | Unlock expired locked accounts      | Scheduled | Runs every 15 minutes to automatically unlock accounts that were temporarily locked due to repeated failed login attempts once lockout duration has elapsed.        |
| 2      | Auto-cancel expired field tasks     | Scheduled | Runs every 10 minutes to scan open or accepted assignments exceeding their deadlines, auto-cancelling the task and logging penalty points in the reputation system. |
| 3      | Clean up old audit log entries      | Scheduled | Runs daily at 2:00 AM to archive and delete audit log entries older than the configured data retention threshold (default 90 days).                                 |
| 4      | Auto-sync & cache reputation scores | Scheduled | Runs hourly to aggregate changes from reputation logs and sync cache scores into user profile records for fast privilege checking.                                  |

# II. Functional Requirements

## 1. Breaking News

### 1.1 Citizen

#### 1.1.1 Homepage


*\[Content \#2: brief descriptions of the screen/function, mapped to the relevant use cases\]*

*\[Content \#3: provide further descriptions for the screen’s components/fields using table format below\]*

| **Field Name**          | **Description**                                                          |
|-------------------------|--------------------------------------------------------------------------|
| Field Name1             | Field description: data type min/max length or value, initial data, etc. |
| Field Name2             | …                                                                        |
| ***Field Group-Name1*** |                                                                          |
| Field Name3             | …                                                                        |
| Field Name4             | …                                                                        |
| ***Field Group-Name2*** |                                                                          |
| …                       | …                                                                        |

#### 1.1.2 Citizen send Breaking News


### 1.2 Editor

#### 1.2.1 Editor check News


#### 1.2.2 Editor co-ordinate Contributor verify 


#### 1.2.3 Editor examine report 


### 1.4 Deputy Editor-in-chef

#### 1.4.1 Deputy EIC examine report


### 1.5 EIC allowed publish


### 1.3 Contributor confirm task 


#### 1.3.1 Contributor write report


…

## 2. User Authentication

### 2.1 User Register

…

### 2.2 User Login

…

## 3. System Administration

### 3.1 System Settings

#### 3.1.1 Setting List


This screen allows the Administrator to:

- View Setting List: view list of current master data.

- Filter Setting List: filter master data by data types, statuses

- Search Settings: enter keyword(s) to search master data by their names or values

- Sort Setting List: sort mater data list (ascending, descending) by clicking column headers

On the screen, s/he can also

- Activate/Deactivate Setting: change status of a specific inactive/active master data

- Choose to go to the Setting Details screens for adding new or updating an existing master data by clicking the New Setting or Edit link.

**Field Description**

<table>
<colgroup>
<col style="width: 13%" />
<col style="width: 86%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Field Name</strong></th>
<th><strong>Description</strong></th>
</tr>
<tr class="odd">
<th>(1)</th>
<th><p>Initial values: all the active setting names with null or blank type</p>
<p>Hover the mouse to show the field name: “Setting Type”</p></th>
</tr>
<tr class="header">
<th>(2)</th>
<th><p>Initial values: All Statuses, Active, Inactive (default value “All Status”)</p>
<p>Hover the mouse to show the field name: “Setting Status”</p></th>
</tr>
<tr class="odd">
<th>(3)</th>
<th>The change-status action is Activate or Deactivate depending on the current status of the relevant setting (Inactive or Active, respectively).</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

#### 3.1.2 Setting Details


This screen allows the Administrator to:

- Add New Setting: add new master data.

- Update Setting Details: update details of a specific master data

**Field Description**

| **Field Name** | **Description**                                                         |
|----------------|-------------------------------------------------------------------------|
| Name           | Data type: non-digit string, max length of 20 characters                |
| Type           | Initial data values: all active setting names (with null or blank type) |
| Value          | Data type: any string, max length of 100 characters                     |
| Priority       | Data type: a positive integer                                           |
| Description    | Data type: any string, max length of 200 characters                     |

### 3.2 User Management

#### 3.2.1 User List

…

#### 3.2.2 User Details

…

## 4. Complaint News

### 4.1 Citizen Portal

#### 4.1.1 Submission 


This screen allows the **Citizen** to:

- Submit News Tip / Complaint: Submit breaking news, civil complaints, or investigative tips to the editorial board along with verified GPS coordinates and timestamps.

- Upload Supporting Evidence: Attach multimedia files (photos, videos, audio recordings, documents) with automatic metadata/EXIF validation.

- Toggle Anonymity & Source Protection: Enable anonymous mode to encrypt contact details while generating a secure tracking PIN code.

**Field Description**

| **Field Name**        | **Description**                                                                                                                                                       |
|-----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Category              | Radio group, required. Allowed values: Tin nóng 24/7 (hot_news), Khiếu nại/Tố cáo (complaint), Phóng sự điều tra (investigation), Ý kiến chuyên gia (expert_opinion). |
| Title                 | Text input, required. Min 10, max 200 characters. Descriptive headline of the reported incident.                                                                      |
| Summary               | Text input, required. String up to 300 characters summarizing the core incident.                                                                                      |
| Detail Content        | Textarea, required. String with min 50, max 5000 characters describing the event timeline, causes, and parties involved.                                              |
| Incident Date         | Datetime picker, required. Occurrence date/time; must not exceed current system time.                                                                                 |
| Province/City         | Dropdown select, required. List of nationwide provinces/cities.                                                                                                       |
| Address               | Text input, required. String up to 250 characters indicating street address or landmark.                                                                              |
| Evidence Files        | File uploader, required (min 1 file). Formats: JPG, PNG, MP4, MP3, PDF. Max 50MB per file. Automatic EXIF GPS extraction.                                             |
| Is Anonymous          | Checkbox, boolean. Default: false. When true, hides public identity and encrypts personal records.                                                                    |
| Full Name             | Text input. Required if Is Anonymous = false. String up to 100 characters.                                                                                            |
| Phone Number          | Text input. Required if Is Anonymous = false. Valid telephone number format (10-11 digits).                                                                           |
| Email                 | Email input. Required if Is Anonymous = false. Valid email format used to receive PIN codes and status updates.                                                       |
| Citizen ID / Passport | Text input, optional. 9 or 12 digit numerical string.                                                                                                                 |
| Relationship          | Dropdown select, optional. Values: Direct Victim, Eyewitness, Legal Representative, Independent Expert.                                                               |
| Policy Agreement      | Checkbox, required (true). Confirms legal compliance under the National Press Law.                                                                                    |


#### 4.1.2 Submission Status Tracker & Evidence Supplement Portal


This screen allows the **Citizen** to:

- Track Submission Status: Check real-time processing status using a unique Tracking Code and 6-digit PIN Code.

- View Editorial Timeline Logs: Inspect the audit trail and timeline steps (Intake -\> AI Triage -\> Editor Review -\> Field Verification -\> Leadership Approval).

- Supplement Evidence & Missing Information: Upload additional media or provide missing mandatory fields in response to editorial requests.

**Field Description**

| **Field Name**            | **Description**                                                                                                                                                                                                       |
|---------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Tracking Code             | Text input, required. Newsroom standard format (e.g., KB-2026-8812), max 20 characters.                                                                                                                               |
| PIN Code                  | Password/Text input, required. 6-digit security numeric PIN provided at initial submission.                                                                                                                           |
| Submission Status         | Read-only badge. Statuses: submitted, need_info, ai_screening, editor_review, assigned_contributor, field_report_submitted, need_more_evidence, editing_draft, deputy_review, eic_review, ready_publishing, rejected. |
| Timeline Log              | Read-only list displaying step numbers, timestamps, actors, and action descriptions.                                                                                                                                  |
| Editorial Request Note    | Read-only callout box displayed when status is need_info or need_more_evidence.                                                                                                                                       |
| Additional Evidence Files | File uploader allowing supplementary photos, videos, and documents.                                                                                                                                                   |
| Additional Info Textarea  | Textarea for submitting missing address or incident details, max 2000 characters.                                                                                                                                     |


### 4.2 Contributor Desk


This screen allows the **Contributor** to:

- Accept Field Assignments: Access task briefs, GPS coordinates, deadlines, and editorial directives.

- Submit Field Verification Report: Conclude verification status (True / Partially True / Unfounded) and attach verified media.

- Draft Article / Upload Word Draft: Compose a raw draft online or upload a .docx manuscript for editorial review.

**Field Description**

| **Field Name**                                    | **Description**                                                                                                                                       |
|---------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| Assignment Task Card                              | Read-only. Displays case code, deadline, severity, GPS coordinates, and editor directives.                                                            |
| <span class="mark">Verification Conclusion</span> | <span class="mark">Radio group, required. Values: isVerifiedTrue = true (Fully true), Partially true, isVerifiedTrue = false (Unfounded/Fake).</span> |
| <span class="mark">Field Summary</span>           | <span class="mark">Textarea, required. Min 20, max 2000 characters detailing on-site findings.</span>                                                 |
| <span class="mark">Witness Statements</span>      | <span class="mark">Textarea, required. Summarizes witness testimonies, local authority remarks, and document extracts.</span>                         |
| <span class="mark">Recommendation</span>          | <span class="mark">Dropdown/Radio, required. Values: publish (Publish article), further_check (Need investigation), unfounded (Drop case).</span>     |
| <span class="mark">Field Evidence Uploader</span> | <span class="mark">File uploader, requires min 1 field item (photos, flycam, uncompressed audio).</span>                                              |
| <span class="mark">Draft Mode</span>              | <span class="mark">Radio button. Values: write_online (Rich text) or upload_file (Word/PDF document).</span>                                          |
| <span class="mark">Field Draft Title</span>       | <span class="mark">Text input, string up to 250 characters.</span>                                                                                    |


### 4.3 Editor Desk


This screen allows the **Editor** to:

- Review AI Screening & Fact-Check Results (UC-13): Inspect spam ratings, credibility metrics, deepfake warnings, and extracted entities.

- Assign Field Verification (UC-14): Delegate on-site tasks to correspondents with custom deadlines and instructions.

- Compose & Polish Articles (UC-15): Edit headlines, sapo, structured body copy, multimedia assets, and tags.

- Submit for Executive Approval (UC-16): Route drafts to Deputy EIC or EIC based on editorial severity level (low_medium vs sensitive_breaking).

- Audit Revision History (UC-17): Compare revisions, diffs, and word count changes across drafts.

**Field Description**

| **Field Name**             | **Description**                                                                                        |
|----------------------------|--------------------------------------------------------------------------------------------------------|
| Submission Filter & Search | Keyword search, status filter, and category filter.                                                    |
| AI Spam Score              | Read-only metric (0 - 100). Scores below 20 indicate low spam probability.                             |
| AI Credibility Score       | Read-only metric (0 - 100) indicating verification confidence.                                         |
| Deepfake Suspicion         | Read-only tag. Values: none, low, moderate, high.                                                      |
| Field Assignee Selector    | Dropdown list of eligible correspondents by territory.                                                 |
| Assignment Deadline        | Datetime picker for on-site report submission.                                                         |
| Assignment Instructions    | Textarea containing field directives from the desk editor.                                             |
| Headline                   | Text input, required. SEO-compliant title, max 250 characters.                                         |
| Sapo (Lead)                | Textarea, required. 50 to 400 characters summarizing news value.                                       |
| Category                   | Dropdown select, required. Editorial section (Society, Transport, Investigation, Urban).               |
| Approval Level             | Radio group, required. low_medium (Deputy EIC) or sensitive_breaking (EIC).                            |
| Author Byline              | Text input, required. Published journalist/contributor name.                                           |
| Editor Name                | Text input, required. Name of desk editor in charge.                                                   |
| Tags                       | Comma-separated tag string.                                                                            |
| Body Content               | Rich textarea, required. Min 100 words. Supports formatting, headers, blockquotes, and media captions. |
| Featured Image             | Media object containing URL, Caption, and Credit.                                                      |
| Editor Notes               | Textarea, optional. Internal notes for executive review.                                               |

### 4.4 Deputy EIC Desk


This screen allows the **Deputy Editor-in-Chief** to:

- Appraise Editorial Drafts: Review manuscripts within assigned editorial blocks.

- Verify Legal & Journalistic Compliance: Audit proof bundles, field reports, and AI risk ratings.

- Approve Publishing: Authorize immediate live publication for standard news.

- Request Revisions or Escalate: Return drafts for rework (need_revision) or forward sensitive articles to the EIC (eic_review).

**Field Description**

| **Field Name**             | **Description**                                                                            |
|----------------------------|--------------------------------------------------------------------------------------------|
| Pending Articles List      | Queue of articles in deputy_review status.                                                 |
| Verification Summary Card  | Executive overview of original tips, field reports, and AI verification scores.            |
| Draft Article Preview      | Full view of headline, sapo, formatted body, photos, captions, and byline.                 |
| Leadership Directive Notes | Textarea for executive instructions or revision reasons, max 1000 characters.              |
| Approve Button             | Updates status to ready_publishing, creates Step 36 timeline entry, and publishes article. |
| Request Revision Button    | Updates status to need_revision with required changes.                                     |
| Escalate to EIC Button     | Promotes case to eic_review for Editor-in-Chief decision.                                  |

### 4.5 EIC Desk


This screen allows the **Editor-in-Chief** to:

- Final Approval for Sensitive/Breaking Cases: Provide supreme authorization for high-impact investigations and breaking news.

- Consult Legal Risk Matrix: Review in-house legal counsel findings and encrypted evidence vaults.

- Publish / Withhold / Escalate Investigations: Issue final publication orders, defer publication, or mandate further investigation.

- Manage Corrections & Retraction: Authorize formal correction notes or retract live articles in compliance with statutory press regulations.

**Field Description**

| **Field Name**             | **Description**                                                                                |
|----------------------------|------------------------------------------------------------------------------------------------|
| Sensitive Article Queue    | List of articles in eic_review or tagged sensitive_breaking.                                   |
| Legal Risk Matrix Card     | Summarizes legal opinions, statutory compliance, and crisis impact levels.                     |
| EIC Supreme Directive      | Textarea for executive instructions regarding series scheduling and source safety.             |
| Retraction Target Selector | Dropdown select containing all currently published articles.                                   |
| Decision Type              | Radio group. Values: correction_published (Correction note) or retracted (Unpublish).          |
| Retraction Reason          | Textarea, required. Formal justification for correction or retraction.                         |
| Public Notice              | Textarea, required. Reader-facing notice displayed on the retracted or corrected article page. |

### 4.5 System Administrator Monitor


This screen allows the **System Administrator** to:

- Manage User Accounts & Roles: Create, update, and toggle active statuses across the 7 RBAC roles.

- Configure Master Settings & Categories: Maintain taxonomy trees, AI confidence thresholds, and department structures.

- Monitor Audit Logs & System Telemetry: Review immutable audit logs, IP addresses, and editorial operations.

**Field Description**

| **Field Name**  | **Description**                                                                                             |
|-----------------|-------------------------------------------------------------------------------------------------------------|
| Name            | Text input, required. Non-digit string, max length of 100 characters.                                       |
| Type            | Dropdown select, required. Values: User Role, Department, News Category, AI Threshold.                      |
| Value / Email   | Text input, required. Unique account identifier or setting parameter, max 100 characters.                   |
| Phone Number    | Text input, optional. 10 to 11 digits.                                                                      |
| Department      | Dropdown select, required. Values: Executive Board, Society Desk, Intake Desk, Correspondents, Tech Center. |
| Assigned Domain | Dropdown select, required for deputy_eic (Society & Urban, Economy, Legal).                                 |
| Priority        | Number input, required. Positive integer (1-99) determining operational precedence.                         |
| Status          | Radio options, required. Values: Active or Inactive.                                                        |
| Description     | Textarea, string up to 300 characters documenting role scope and permissions.                               |

## 5. Background Job Inventory

### 5.1 Unlock Expired Locked Accounts (JOB-01)

***Trigger***: Scheduled — every 15 minutes

***Purpose***: Automatically unlocks accounts that were locked after failed sign-in attempts, once the lockout duration has elapsed

***Processing steps*:**

1.  Find all accounts with status = Locked where the lockout timestamp is more than 10 minutes ago.

2.  For each account found: reset the failed sign-in count to zero, set status back to Active.

3.  Log the number of accounts unlocked in this run.

***Failure behavior*:**

| **Scenario**             | **System behavior**                                                                                                                                |
|--------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| Database unreachable     | Job retries up to 3 times with 30-second intervals. If still failing, logs a critical error. Accounts remain locked until the next successful run. |
| No locked accounts found | Job completes immediately with no action — this is normal and expected.                                                                            |

### 5.2 Clean Up Old Audit Log Entries (JOB-02)

***Trigger***: Scheduled — daily at 2:00 AM

***Purpose***: Removes audit log entries older than the configured retention period to prevent unbounded database growth.

***Processing steps:***

1.  Determine the configured log retention period (default: 90 days).

2.  Find all audit log entries with a timestamp older than the retention threshold.

3.  Delete the old entries in batches of up to 5,000 records per run — to avoid locking the database for an extended period.

4.  If records remain after one batch, schedule the next batch to run 5 minutes later rather than deleting everything at once.

5.  Log the total number of entries deleted and the number of batches processed.

**Failure behavior:**

| **Scenario**                    | **System behavior**                                                                                        |
|---------------------------------|------------------------------------------------------------------------------------------------------------|
| Database timeout during delete  | Current batch rolled back. Job logs a warning. Tries again at the next scheduled time. No data corruption. |
| Retention period not configured | Job uses default of 90 days and logs a warning that the setting was not found.                             |

## 6. External API Inventory

### 6.1 HTTP Method: URL pattern (API-ID)

| ***URL***     | HTTP method: URL pattern                   |
|---------------|--------------------------------------------|
| ***Purpose*** | Purpose in one plain-language sentence     |
| ***Caller***  | Who the caller is (which external system)  |
| ***Auth***    | Authentication requirement (yes/no + type) |

### 6.2 VnPay Webhook (API-02)

| ***URL***     | POST: /api/v1/commerce/payment/webhook/vnpay                                   |
|---------------|--------------------------------------------------------------------------------|
| ***Purpose*** | Receives payment confirmation (IPN) from VNPay; triggers access grant creation |
| ***Caller***  | VNPay payment gateway                                                          |
| ***Auth***    | HMAC-SHA512 signature validation                                               |

### 6.3 SePay Webhook (API-03)

| ***URL***     | POST: /api/v1/commerce/payment/webhook/sepay                             |
|---------------|--------------------------------------------------------------------------|
| ***Purpose*** | Receives payment confirmation from SePay; triggers access grant creation |
| ***Caller***  | SePay payment gateway                                                    |
| ***Auth***    | HMAC signature validation                                                |

# III. Requirement Appendix

## 1. Business Rules

| **GBR-ID** | **Rule Statement**                                                                                                            | **Applies To**                                           | **Rationale**                                                 | **Enforced By**                                              |
|------------|-------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------|---------------------------------------------------------------|--------------------------------------------------------------|
| GB-01      | Status changes are one-way and permanent. No status may be reverted to a previous value.                                      | Job posting status, Application status, Interview status | Prevents data integrity loss; maintains clear audit trail.    | The system automatically on every status change              |
| GB-02      | Internal Notes are never visible to Candidates, regardless of how they access the system.                                     | All views accessible to Candidates                       | Allows HR to write candid internal assessments.               | The system automatically on every page and data request      |
| GB-03      | CV files may only be accessed by staff with permission to view the associated Application. Access verified on every download. | All CV file access                                       | Protects Candidates' personal data from unauthorised access.  | The system automatically on every file access request        |
| GB-04      | When a sign-in fails, the message must not reveal whether the username exists or the password was wrong.                      | Sign-in                                                  | Prevents attackers from discovering valid usernames.          | The system automatically on every failed sign-in             |
| GB-05      | A deactivated account cannot sign in, regardless of password correctness.                                                     | Sign-in                                                  | Ensures departed staff lose access immediately.               | The system automatically on every sign-in attempt            |
| GB-06      | An Interviewer may only access Applications they have been explicitly assigned to.                                            | Application access                                       | Maintains pipeline confidentiality; prevents evaluation bias. | The system automatically on every Application access request |

## 2. System Messages

| **\#** | **Message code** | **Message Type**           | **Context**                                               | **Content**                                              |
|--------|------------------|----------------------------|-----------------------------------------------------------|----------------------------------------------------------|
| 1      | MSG01            | In line                    | There is not any search result                            | *No search results.*                                     |
| 2      | MSG02            | In red, under the text box | Input-required fields are empty                           | *The \* field is required.*                              |
| 3      | MSG03            | Toast message              | Updating asset(s) information successfully                | *Update asset(s) successfully.*                          |
| 4      | MSG04            | Toast message              | Adding new asset successfully                             | *Add asset successfully.*                                |
| 5      | MSG05            | Toast message              | Confirming email of asset hand-over is sent successfully  | *A confirmation email has been sent to {email_address}.* |
| 6      | MSG08            | In red, under the text box | Input value length \> max length                          | *Exceed max length of {max_length}.*                     |
| 7      | MSG09            | In line                    | Username or password is not correct when clicking sign-in | *Incorrrect user name or password. Please check again.*  |
| 8      | ..               |                            |                                                           |                                                          |

## 3. Other Requirements

…
