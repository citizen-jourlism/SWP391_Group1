package com.example.citizen_journalism.service;

import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.SubmissionEvent;
import com.example.citizen_journalism.repository.SubmissionEventRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * ĐỔI TRẠNG THÁI HỒ SƠ + GHI NHẬT KÝ trong cùng một chỗ.
 *
 * TẠI SAO gom lại? Mọi chức năng làm hồ sơ đổi trạng thái (gửi mới, Biên tập viên duyệt, đề nghị bổ sung,
 * Phó TBT / Tổng biên tập phê duyệt... ở các bản sau) đều PHẢI để lại 1 dòng nhật ký cho người gửi theo dõi.
 * Gọi hàm này thay vì tự setStatus() thì không bao giờ quên ghi nhật ký.
 *
 * Đang dùng ở: SubmissionService.create() (bước "Tiếp nhận hồ sơ").
 */
@Service
@RequiredArgsConstructor
public class SubmissionEventService {

    private final SubmissionEventRepository eventRepository;

    /**
     * @param submission  hồ sơ (đang được JPA quản lý trong transaction)
     * @param status      trạng thái MỚI của hồ sơ
     * @param actor       ai thực hiện (vai trò)
     * @param description mô tả cho người gửi đọc
     * @param note        lời nhắn gửi người dân (có thể null)
     */
    /**
     * Bước Biên tập viên đề nghị bổ sung gần nhất; null nếu chưa có.
     * Phải lọc theo người thực hiện vì trong lúc hồ sơ chờ bổ sung, CTV nhận việc hoặc nộp báo cáo cũng tạo bước
     * mang cùng trạng thái, mà các bước đó không có lời nhắn.
     *
     * @param events nhật ký của hồ sơ, từ cũ đến mới
     */
    public static SubmissionEvent latestInfoRequest(List<SubmissionEvent> events) {
        for (int i = events.size() - 1; i >= 0; i--) {
            SubmissionEvent event = events.get(i);
            if (event.getStatus() == Submission.SubmissionStatus.NEED_MORE_INFO && event.getActor() == SubmissionEvent.Actor.EDITOR) {
                return event;
            }
        }
        return null;
    }

    public void record(Submission submission, Submission.SubmissionStatus status, SubmissionEvent.Actor actor,
                       String description, String note) {
        submission.setStatus(status);
        eventRepository.save(SubmissionEvent.builder()
                .submission(submission)
                .status(status)
                .actor(actor)
                .description(description)
                .note(note)
                .build());
    }
}
