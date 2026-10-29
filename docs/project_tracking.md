# Group 1 - Project Tracking

Source: `Group1_ProjectTracking(7).xlsx`

## Table of Contents

- [Use Case](#use-case)
- [Functions](#functions)

---

## Use Case

| Use Case | EntityName1 | EntityName2 | … | Primary Actor | Secondary Actor | Description |
| --- | --- | --- | --- | --- | --- | --- |
| View home page | C | R |  | All | All | Allowed all user view homepage |
| Log In |  |  |  | All | All | Allows all user to authenticate with registered credentials to access role-based system features. |
| Register Account |  |  |  | All |  | Allow user to create an account to access the system. |
| Submit Breaking News |  |  |  | Citizen | Expert | Allow user to submit information about a breaking news event to the newsroom. |
| Submit Complaint |  |  |  | Citizen | Expert | Allow user  to submit a complain, feedback, or report to the newsroom |
| Submit Anonymously |  |  |  | Citizen | Expert | Allow userto submit information while protecting their identity.  ( Only submit when sends breaking news or Complaint ) |
| Attach Supporting Materials |  |  |  | Citizen | Expert | Allow user to attach relevant photos, videos, audio files, or documents. |
| Cancel Pending Submission |  |  |  | Citizen | Expert | Allow user to cancel a submission while it is in Pending status. |
| Track Submission Status |  |  |  | Citizen | Expert | Allow user to track the processing status of submitted information. |
| Provide Additional Information |  |  |  | Citizen | Expert | Allow user  to provide additional information or evidence when requested by the Editor. |
| Write article |  |  |  | Expert |  | Allow the Expert  write article about fields |
| Verify user authentic |  |  |  | Citizen | Expert | Allow user verify user authentic by EKYC |
| Register as a Contributor |  |  |  | Citizen | Expert | Allow an eligible user to submit an application to become a Contributor. |
| Track Contributor Application |  |  |  | Citizen | Expert | Allow user to track the processing status of the Contributor application. |
| Track Article Status |  |  |  | Expert | Contributor | Allow the Contributor to track the processing status of submitted articles. |
| Accumulate Contribution Points |  |  |  | Citizen | System, Editor | Allow user to earn contribution points automatically after submitting valid and verified hot news. Includes penalty flow for fake or duplicated news |
| Redeem Reward Points |  |  |  | Citizen | System | Allow user to exchange accumulated contribution points for rewards, subject to account violation checks and point balance validation. |
| Update Profile |  |  |  | All | All | Allow user to update their profile information. |
| Accept Evidence Collection Assignment / Denied |  |  |  | Contributor |  | Allow the Contributor to accept an assigned evidence collection task. |
| Cancel Evidence Collection Assignment |  |  |  | Contributor |  | Allow the Contributor to cancel an assigned evidence collection task. |
| Submit Evidence |  |  |  | Contributor |  | Allow the Contributor to submit first-hand evidence, including photos, videos, audio recordings, interviews, GPS, timestamps, and related documents. |
| Write and Submit Field Report |  |  |  | Contributor |  | Allow the Contributor to write a news article or field report during fieldwork and submit it to the newsroom. |
| View Editor Feedback |  |  |  | Contributor |  | Allow the Contributor to view feedback and revision requests from the Editor. |
| Edit Article |  |  |  | Contributor |  | Allow the Contributor to revise an article based on Editor feedback. |
| Submit Additional Evidence |  |  |  | Contributor |  | Allow the Contributor to provide additional media or evidence when requested by the Editor. |
| View Contribution History |  |  |  | Contributor |  | Allow the Contributor to view their previous submitted articles, reports, and contribution history. |
| View Submission Queue |  |  |  | Editor |  | View new news, articles, or complaint forms submitted to the system. |
| View AI Screening Results |  |  |  | Editor | EIC, D-EIC | View spam flags, duplicate checks, content classification, AI summary, and risk indicators. |
| Reject Submission |  |  |  | Editor |  | Directly reject standard submissions that do not meet quality criteria, providing feedback reasons to the author. |
| Check for Duplication |  |  |  | Editor |  | Evaluate similar or duplicate content based on AI recommendations. |
| Assess Impact Score |  |  |  | Editor |  | Adjusting the scoring criteria |
| Request Additional Information |  |  |  | Editor |  | Request the Citizen, Contributor, or Expert to provide supplementary evidence or information. |
| Review Citizen/Expert Upgrade Request |  |  |  | Editor |  | Review the profile of a Citizen requesting to upgrade to a Contributor before forwarding it to the Deputy Editor-in-Chief. |
| Evaluate User Performance |  |  |  | Editor |  | Check the reputation score of Citizens and the performance score of Contributors. |
| Handle User Violations |  |  |  | Editor |  | Send warnings, apply penalties (reduce points, assign fewer jobs), flag accounts, or lock accounts for serious violations. |
| Edit Article |  |  |  | Editor |  | Edit the content, structure, and title of the submitted article. |
| Assign Field Verification |  |  |  | Editor |  | Allow the Editor to assign a field verification task to a Contributor. |
| Audit Revision History |  |  |  | Editor |  | Allow the Editor to review article revision history. |
| View Pending Approval |  |  |  | EIC |  | Allow the Editor-in-Chief to view articles and submissions that are waiting for final editorial approval. |
| Review Important / Breaking News |  |  |  | EIC |  | Allow the Editor-in-Chief to review important, sensitive, or breaking content, including the article, supporting evidence, sources, and verification results. |
| Review Verification Result |  |  |  | EIC |  | Allow the Editor-in-Chief to review the Verification Report and verification result before making the final approval decision. |
| Approve Content |  |  |  | EIC |  | Allow the Editor-in-Chief to approve content that meets the editorial, verification, and legal requirements. |
| Request Revision |  |  |  | EIC |  | Allow the Editor-in-Chief to request revisions or additional information when the submitted content does not meet the required standards. |
| Mark Ready for Publishing |  |  |  | EIC |  | Allow the Editor-in-Chief to move approved content to the READY_FOR_PUBLISHING status. |
| Review AI Disclosure / Content Origin |  |  |  | EIC |  | Allow the Editor-in-Chief to review whether AI was used to assist, generate, or modify the content and ensure that the AI usage information is properly recorded. |
| Handle Correction |  |  |  | EIC |  | Allow the Editor-in-Chief to review and approve corrections to published content when errors or inaccurate information are identified. |
| Review Account Violation Report |  |  |  | EIC |  | Allow the Editor-in-Chief to check and evaluate serious violation reports of Citizen/CTV accounts sent by Editors |
| Approve Account Unlocking / Retraction Policy |  |  |  | EIC |  | Allow the Editor-in-Chief (or Deputy EIC) to review and give final authorization for unlocking severely restricted accounts or handling major appeals. |
| View Editorial Pipeline |  |  |  | Deputy Editor-in-Chief |  | Monitor the progress of all submissions, screening queues, and verification tasks across desks. |
| Preliminary Review of Content |  |  |  | Deputy Editor-in-Chief |  | Perform a preliminary review of edited articles, verification reports, and AI flags before forwarding to the EIC. |
| Approve Routine Submissions |  |  |  | Deputy Editor-in-Chief |  | Give intermediate or final editorial approval for standard, non-sensitive content delegated by the EIC. |
| Request Revision from Editor |  |  |  | Deputy Editor-in-Chief |  | Send articles back to the assigned Editor with specific revision notes regarding quality, accuracy, or formatting. |
| Approve Braking News |  |  |  | Deputy Editor-in-Chief |  | Approve the report from Editor and Pass to EIC to allow publish |
| Approve Citizen Upgrade Request |  |  |  | Deputy Editor-in-Chief |  | Review and officially approve or reject upgrade requests from Citizens to Contributors forwarded by Editors. |
| Manage Contributor Contracts & Badges |  |  |  | Deputy Editor-in-Chief |  | Issue, suspend, or renew official verification badges and task allowances for active Contributors. |
| Review Account Penalty Appeals |  |  |  | Deputy Editor-in-Chief |  | Review appeals submitted by penalized or flagged users, approving relief or escalating severe bans to the EIC. |
| Monitor Editorial Deadlines & SLAs |  |  |  | Deputy Editor-in-Chief |  | Track publishing timelines, overdue field verifications, and editorial bottlenecks to ensure timely publication. |
| Change  Password |  |  |  | All |  | Allow user change their password |
| Forgot Password |  |  |  | All |  | Allow user forgot password and take new password. |
| Manage User Accounts |  |  |  | System admin |  | Create, suspend, reactivate, lock, unlock, or reset user accounts across the system. |
| Provision Internal Accounts |  |  |  | System admin |  | Create and initialize accounts for authorized newsroom personnel. These may include Editor, EIC, and System Admin. |
| Update User Role |  |  |  | System admin |  | Allow the System Admin to change an approved user's role from CITIZEN to CONTRIBUTOR. The role change must be authorized and recorded in the audit log. |
| View & Export Audit Logs |  |  |  | System admin |  | View, filter, and export records of important system and administrative activities. |
| Manage Categories |  |  |  | System admin |  | Create, update, organize, or disable news categories and topical domains. |
| Notification |  |  |  | All |  | Allow users to receive and view real-time system alerts (task assignments, status updates, revision requests). |
| Verify Media Authenticity (Deepfake & Tampering Detection) |  |  |  | AI |  | Analyze uploaded images and videos to detect digital tampering, synthetic generation (deepfake/AI-generated media), compression artifacts, and EXIF metadata anomalies, producing an authenticity confidence score. |
| Cross-check Reverse Media & Context |  |  |  | AI |  | Perform reverse media search across web databases and past archives to detect out-of-context reuse, stolen media, or misattributed historical images/footage. |
| Generate Content Summary |  |  |  | AI |  | Automatically generate structured, multi-tier summaries (concise bullets, key takeaway points, and 5W1H extraction) from long-form submissions, field reports, or complaint documents. |
| Automated Content Quality & Editorial Review |  |  |  | AI |  | Automatically screen article text against journalistic standards, checking for spelling/grammar errors, biased/sensationalist tone, hate speech, and adherence to newsroom publishing guidelines. |
| Suggest Editorial Recommendations |  |  |  | AI |  | Provide automated editorial suggestions, including headline alternatives, SEO/readability optimization, appropriate categorization, relevant content tags, and recommendations for additional fact-checking angles. |
| Detect AI-Generated Text & Disclosure Compliance |  |  |  | AI |  | Screen submitted textual content to detect the probability of LLM-generated text and verify whether the author has complied with the newsroom's mandatory AI disclosure policies. |

*71 data rows in this worksheet.*

### Cell Comments

- **B1**: KienNT    (2026-09-13 16:03:54)
Điền tên entity và bên dưới là các tương tác (C~Create, R~Read, U~Update, hoặc D~Delete) từ use case tới entity

---

## Functions

| Flow | Role | Function Name | Type | TableName1 | TableName2 | … | Use Cases | Plan | In Charge | SRS | SDS | Status | Notes / Updates |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| User | User | View home page | Screen | C | R |  | View home page | Iter 1 | HienNM | II.1.1.1 |  | To Do |  |
| User | User | Log In | Screen |  |  |  | Log In | Iter 1 | TungTT | II.2.2 |  | To Do |  |
| User | User | Register Account | Screen |  |  |  | Register Account | Iter 1 | AnhTT | II. 2.1 |  | To Do |  |
| Hot News & Complaint | Citizen + Expert | Submit Breaking News | Screen |  |  |  | Submit Breaking News | Iter 1 | BinhNH | II.1.1.2 |  | To Do |  |
| Hot News & Complaint | Citizen + Expert | Submit Anonymously | Function |  |  |  | Submit Anonymously | Iter 1 | BinhNH | II.4.1.1 |  | To Do |  |
| Hot News & Complaint | Citizen + Expert | Attach Supporting Materials | Function |  |  |  | Attach Supporting Materials | Iter 1 | BinhNH | II.4.1.1 |  | To Do |  |
| Hot News & Complaint | Editor | View Submission Queue | Screen |  |  |  | View Submission Queue | Iter 2 | BinhNH | II.4.3 |  | To Do |  |
| Hot News & Complaint | Editor ( AI Check ) | View AI Screening Results | External API |  |  |  | View AI Screening Results | Iter 2 | BinhNH | II.4.3 |  | To Do |  |
| Hot News & Complaint | Editor | Check for Duplication | External API |  |  |  | Check for Duplication | Iter 2 | BinhNH | II.4.3 |  | To Do |  |
| Hot News & Complaint | Editor | Request Additional Information | Screen |  |  |  | Request Additional Information | Iter 2 | BinhNH | II.4.3 |  | To Do |  |
| Hot News & Complaint | Editor | Request Revision | Function |  |  |  | Request Revision (EIC) | Iter 3 | BinhNH | II.4.5 |  | To Do |  |
| Hot News & Complaint | Editor | Assess Impact Score | Batch Job |  |  |  | Assess Impact Score | Iter 2 | HienNM | II.4.3 |  | To Do |  |
| Hot News & Complaint | Editor | Preliminary Review of Content | Screen |  |  |  | Preliminary Review of Content | Iter 3 | BinhNH | II.4.4 |  | To Do |  |
| Hot News + Complaint | Editor | Approve Breaking News | Function |  |  |  | Approve Braking News | Iter 3 | BinhNH | II.4.4 |  | To Do |  |
| Hot News + Complaint | Editor | Review Important / Breaking News | Function |  |  |  | Review Important / Breaking News | Iter 2 | BinhNH | II.4.5 |  | To Do |  |
| Hot News & Complaint | Editor | Approve Content | Screen |  |  |  | Approve Content | Iter 2 | HienNM | II.4.5 |  | To Do |  |
| Hot News & Complaint | EIC/ D_EIC | Mark Ready for Publishing | Screen |  |  |  | Mark Ready for Publishing | Iter 3 | BinhNH | II.4.5 |  | To Do |  |
| Expert / Researcher | Expert | Manage draft | Screen |  |  |  | Manage draft | Iter 1 | HienNM | II.1.3.1 |  | To Do |  |
| Expert / Researcher | Expert | Write article | Screen |  |  |  | Write article | Iter 1 | HienNM | II.1.3.1 |  | To Do |  |
| Hot News & Complaint | Expert + Citizen | Provide Additional Information | Screen |  |  |  | Provide Additional Information | Iter 2 | BinhNH | II.4.1.2 |  | To Do |  |
| Expert / Researcher | Expert | Track Article Status | Function |  |  |  | Track Article Status | Iter 2 | HienNM | II.4.2 |  | To Do |  |
| Expert / Researcher | Editor | Edit Article | Screen |  |  |  | Edit Article | Iter 2 | HienNM | II.4.3 |  | To Do |  |
| Hot News & Complaint | Expert + Citizen | Cancel Pending Submission | Screen |  |  |  | Cancel Pending Submission | Iter 2 | BinhNH | N/A |  | To Do |  |
| Hot News + Complaint | Expert + Citizen | Submit Evidence | Screen |  |  |  | Submit Evidence | Iter 2 | BinhNH | II.4.2 |  | To Do |  |
| Assign Contributor | Editor | Assign Field Verification | Screen |  |  |  | Assign Field Verification | Iter 2 | AnhTT | II.4.3 |  | To Do |  |
| Assign Contributor | Contributor | Field Task List | Screen |  |  |  | Manage Task | Iter 2 | AnhTT |  |  |  |  |
| Assign Contributor | Contributor | Accept / Denied Evidence Collection Assignment | Screen |  |  |  | Accept Evidence Collection Assignment / Denied | Iter 2 | AnhTT | II.4.2 |  | To Do |  |
| Assign Contributor | Contributor | Cancel Evidence Collection Assignment | Screen |  |  |  | Cancel Evidence Collection Assignment | Iter 2 | AnhTT | II.4.2 |  | To Do |  |
| Assign Contributor | Contributor | Track Submission Status | Screen |  |  |  | Track Submission Status | Iter 1 | AnhTT | II.4.1.2 |  | To Do |  |
| Hot News & Complaint | Expert + Citizen | Submit Complaint | Screen |  |  |  | Submit Complaint | Iter 1 | AnhTT | II.4.1.1 |  | To Do |  |
| Bonus Point | Expert + Citizen | Reward Redemption Screen | Screen |  |  |  | Redeem Reward Points | Iter 3 | DuyBK | N/A |  | To Do |  |
| Bonus Point | Expert + Citizen | Point Accumulation Logic | Batch Job |  |  |  | Accumulate Contribution Points | Iter 2 | DuyBK | N/A |  | To Do |  |
| Contributor Registration Process | Expert + Citizen | Register as a Contributor | Screen |  |  |  | Register as a Contributor | Iter 1 | TungTT | N/A |  | To Do |  |
| Contributor Registration Process | Expert + Citizen | Track Contributor Application | Screen |  |  |  | Track Contributor Application | Iter 1 | TungTT | N/A |  | To Do |  |
| User | User | Update Profile | Screen |  |  |  | Update Profile | Iter 1 | DuyBK | N/A |  | To Do |  |
| User | User | Change Password | Screen |  |  |  | Change Password | Iter 1 | DuyBK | N/A |  | To Do |  |
| User | User | Forgot Password | Screen |  |  |  | Forgot Password | Iter 1 | DuyBK | N/A |  | To Do |  |
| Assign Contributor | Contributor | Write and Submit Field Report | Screen |  |  |  | Write and Submit Field Report | Iter 2 | AnhTT | II.4.2 |  | To Do |  |
| Assign Contributor | Contributor | View Editor Feedback | Screen |  |  |  | View Editor Feedback | Iter 2 | AnhTT | II.4.2 |  | To Do |  |
| Assign Contributor | Contributor | Edit Article (Contributor) | Screen |  |  |  | Edit Article (Contributor) | Iter 2 | AnhTT | II.4.2 |  | To Do |  |
| Assign Contributor | Contributor | Submit Additional Evidence | Screen |  |  |  | Submit Additional Evidence | Iter 2 | AnhTT | II.4.2 |  | To Do |  |
| Assign Contributor | Contributor | View Contribution History | Screen |  |  |  | View Contribution History | Iter 2 | AnhTT | II.4.2 |  | To Do |  |
| Hot News & Complaint | Editor | Reject Submission | Screen |  |  |  | Reject Submission | Iter 2 | BinhNH | II.4.3 |  | To Do |  |
| Contributor Registration Process | Editor | Review Citizen/Expert Upgrade Request | Screen |  |  |  | Review Citizen/Expert Upgrade Request | Iter 2 | TungTT | II.4.3 |  | To Do |  |
| Contributor Registration Process | Editor | Evaluate User Performance | Batch Job |  |  |  | Evaluate User Performance | Iter 2 | TungTT | II.4.3 |  | To Do |  |
| Penalty | Editor | Handle User Violations | Screen |  |  |  | Handle User Violations | Iter 2 | DuyBK | II.4.3 |  | To Do |  |
| Hot News & Complaint | Expert + Citizen | Audit Revision History | Screen |  |  |  | Audit Revision History | Iter 2 | BinhNH | II.4.3 |  | To Do |  |
| Hot News & Complaint | Expert + Citizen | View Pending Approval | Screen |  |  |  | View Pending Approval | Iter 2 | BinhNH | II.4.5 |  | To Do |  |
| Hot News + Complaint | Editor | Review Verification Result | Screen |  |  |  | Review Verification Result | Iter 2 | BinhNH | II.4.5 |  | To Do |  |
| Hot News & Complaint | Editor | Review AI Disclosure / Content Origin | Screen |  |  |  | Review AI Disclosure / Content Origin | Iter 3 | BinhNH | II.4.5 |  | To Do |  |
| Penalty | Editor | Handle Correction | Screen |  |  |  | Handle Correction | Iter 2 | DuyBK | II.4.5 |  | To Do |  |
| Penalty | Editor | Review Account Violation Report | Screen |  |  |  | Review Account Violation Report | Iter 3 | DuyBK | II.4.5 |  | To Do |  |
| Penalty | Editor | Approve Account Unlocking / Retraction Policy | Screen |  |  |  | Approve Account Unlocking / Retraction Policy | Iter 2 | DuyBK | II.4.5 |  | To Do |  |
| Hot News & Complaint | Editor | View Editorial Pipeline | Screen |  |  |  | View Editorial Pipeline | Iter 3 | AnhTT | II.4.4 |  | To Do |  |
| Hot News & Complaint | D_EIC/ EIC | Approve Routine Submissions | Screen |  |  |  | Approve Routine Submissions | Iter 3 | BinhNH | II.4.4 |  | To Do |  |
| Hot News & Complaint | D_EIC/ EIC | Request Revision | Screen |  |  |  | Request Revision from Editor | Iter 3 | BinhNH | II.4.4 |  | To Do |  |
| Contributor Registration Process | D_EIC/ EIC | Approve Citizen Upgrade Request | Screen |  |  |  | Approve Citizen Upgrade Request | Iter 3 | TungTT | II.4.4 |  | To Do |  |
| Editor Manage | Editor | Manage Contributor Contracts & Badges | Screen |  |  |  | Manage Contributor Contracts & Badges | Iter 3 | TungTT | II.4.4 |  | To Do |  |
| Penalty | Editor | Review Account Penalty Appeals | Screen |  |  |  | Review Account Penalty Appeals | Iter 3 | DuyBK | II.4.4 |  | To Do |  |
| Editor Manage | System admin | View & Export Audit Logs | Screen |  |  |  | View & Export Audit Logs | Iter 2 | TungTT | II.3.2 |  | To Do |  |
| Editor Manage | Editor | Manage Categories | Screen |  |  |  | Manage Categories | Iter 2 | TungTT | II.3.1 |  | To Do |  |
| User | User | Notification | Screen |  |  |  | Notification | Iter 2 | TungTT | N/A |  | To Do |  |
| Hot News & Complaint | Editor | Verify Media Authenticity (Deepfake & Tampering Detection) | External API |  |  |  | Verify Media Authenticity (Deepfake & Tampering Detection) | Iter 3 | BinhNH | N/A |  | To Do |  |
| Hot News & Complaint | Editor | Cross-check Reverse Media & Context | External API |  |  |  | Cross-check Reverse Media & Context | Iter 3 | BinhNH | N/A |  | To Do |  |
| Hot News & Complaint | AI Generate ( Editor review ) | Generate Content Summary | External API |  |  |  | Generate Content Summary | Iter 3 | BinhNH | N/A |  | To Do |  |
| Hot News & Complaint | Editor | Automated Content Quality & Editorial Review | External API |  |  |  | Automated Content Quality & Editorial Review | Iter 3 | BinhNH | N/A |  | To Do |  |
| Expert / Researcher | Editor | Suggest Editorial Recommendations | External API |  |  |  | Suggest Editorial Recommendations | Iter 3 | HienNM | N/A |  | To Do |  |
| Expert / Researcher | Citizen | Update Expert | Screen |  |  |  | Update Expert |  | HienNM |  |  |  |  |
| Expert / Researcher | Editor | Detect AI-Generated Text & Disclosure Compliance | External API |  |  |  | Detect AI-Generated Text & Disclosure Compliance | Iter 3 | HienNM | N/A |  | To Do |  |
| System admin | System admin | Dashboard Sysadmin | Screen |  |  |  | Manage account | Iter 1 | AnhTT | II.4.5 |  | To Do |  |
| System admin | System admin | Creat Account | Screen |  |  |  | Manage account | Iter 1 | AnhTT | II.4.5 |  | To Do |  |
| System admin | System admin | View Account list | Screen |  |  |  | Manage account | Iter 2 | HienNM | II.4.5 |  | To Do |  |
| System admin | System admin | Edit User Account | Function |  |  |  | Manage account | Iter 2 | HienNM | II.4.5 |  | To Do |  |
| System admin | System admin | Reset Password | Function |  |  |  | Manage account | Iter 2 | HienNM | II.4.5 |  | To Do |  |

*74 data rows in this worksheet.*

### Cell Comments

- **E1**: KienNT    (2026-09-13 16:03:54)
Điền tiên bảng và bên dưới là các tương tác (C~Create, R~Read, U~Update, D~Delete) từ màn hình/chức năng vào bảng

- **F1**: KienNT    (2026-09-13 16:03:54)
Điền tiên bảng và bên dưới là các tương tác (C~Create, R~Read, U~Update, D~Delete) từ màn hình/chức năng vào bảng

- **K1**: KienNT    (2026-09-13 16:03:54)
Phân tích yêu cầu cho màn hình/chức năng được mô tả trong phần nào của tài liệu SRS?

- **L1**: KienNT    (2026-09-13 16:03:54)
Thiết kế cho màn hình/chức năng được mô tả trong phần nào của tài liệu SDS?

---
