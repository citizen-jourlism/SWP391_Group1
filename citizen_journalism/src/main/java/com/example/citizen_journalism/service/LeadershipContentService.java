package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.entity.*;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.exception.ErrorCode;
import com.example.citizen_journalism.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.validation.constraints.*;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LeadershipContentService {
    private final EntityManager em;
    private final UserRepository users;
    private final EditorialReviewRepository reviews;
    private final SubmissionEventService events;

    public record Decision(@NotNull Action decision, @Size(max=2000) String note) {}
    public enum Action { APPROVE, REJECT, ESCALATE }
    public record Content(String kind, Long id, String code, String title, String content,
            String author, String field, String priority, String status) {}

    private User leader(String userId) {
        User user = users.getActiveById(userId);
        if (user.getRole() != User.Role.DEPUTY_EIC && user.getRole() != User.Role.EIC)
            throw AppException.forbidden("Chỉ lãnh đạo được duyệt nội dung.", ErrorCode.FORBIDDEN);
        return user;
    }

    @Transactional(readOnly=true)
    public PageResponse<Content> list(String userId, String kind, int page, int size) {
        User user = leader(userId);
        if (!List.of("submissions", "research").contains(kind)) throw AppException.badRequest("Loại nội dung không hợp lệ.");
        int safePage = Math.max(0, page), safeSize = Math.max(1, Math.min(size, 100));
        String state = user.getRole() == User.Role.EIC ? "EIC_PENDING" : "DEPUTY_PENDING";
        String entity = kind.equals("research") ? "ResearchArticle" : "Submission";
        String property = kind.equals("research") ? "reviewStatus" : "status";
        Object status = kind.equals("research") ? ResearchArticle.ReviewStatus.valueOf(state) : Submission.SubmissionStatus.valueOf(state);
        String where = " where a." + property + " = :status";
        if (user.getRole() == User.Role.DEPUTY_EIC) where += kind.equals("research")
                ? " and exists (select c from Category c where c.name=a.field and c.deputyEic.id=:deputy)"
                : " and a.category.deputyEic.id=:deputy";
        var query = em.createQuery("select a from " + entity + " a" + where + " order by a.createdAt, a.id").setParameter("status", status);
        var counter = em.createQuery("select count(a) from " + entity + " a" + where, Long.class).setParameter("status", status);
        if (user.getRole() == User.Role.DEPUTY_EIC) { query.setParameter("deputy", userId); counter.setParameter("deputy", userId); }
        List<?> rows = query.setFirstResult(safePage * safeSize).setMaxResults(safeSize).getResultList();
        long total = counter.getSingleResult();
        return new PageResponse<>(rows.stream().map(this::view).toList(), safePage, safeSize, total, (int)((total + safeSize - 1) / safeSize));
    }

    @Transactional(readOnly=true)
    public Content get(String userId, String kind, Long id) {
        User user = leader(userId);
        Object row = find(kind, id, false);
        requireResponsible(user, row);
        return view(row);
    }

    @Transactional
    public Content decide(String userId, String kind, Long id, Decision request) {
        User user = leader(userId);
        Object row = find(kind, id, true);
        requireResponsible(user, row);
        boolean deputy = user.getRole() == User.Role.DEPUTY_EIC;
        String expected = deputy ? "DEPUTY_PENDING" : "EIC_PENDING";
        String current = row instanceof Submission s ? s.getStatus().name() : String.valueOf(((ResearchArticle)row).getReviewStatus());
        if (!expected.equals(current)) throw AppException.conflict("Nội dung không còn chờ cấp của bạn phê duyệt.");
        String note = request.note() == null ? "" : request.note().trim();
        if (request.decision() != Action.APPROVE && note.length() < 10)
            throw AppException.badRequest("Vui lòng ghi lý do ít nhất 10 ký tự.");
        if (!deputy && request.decision() == Action.ESCALATE) throw AppException.badRequest("Tổng biên tập là cấp duyệt cuối.");
        boolean important = row instanceof Submission s
                ? s.getPriority() == Submission.Priority.HIGH || s.getPriority() == Submission.Priority.BREAKING
                : ((ResearchArticle)row).getPriority() == ResearchArticle.Priority.HIGH;
        boolean escalate = deputy && (request.decision() == Action.ESCALATE || (request.decision() == Action.APPROVE && important));
        boolean reject = request.decision() == Action.REJECT;
        String next = reject ? (deputy ? "DEPUTY_REJECTED" : "EIC_REJECTED") : escalate ? "EIC_PENDING" : "READY_FOR_PUBLISHING";
        EditoralReview review = EditoralReview.builder().reviewer(user)
                .reviewRole(deputy ? EditoralReview.ReviewRole.DEPUTY_EIC : EditoralReview.ReviewRole.EIC)
                .action(reject ? EditoralReview.ReviewAction.REJECT : escalate ? EditoralReview.ReviewAction.ESCALATE : EditoralReview.ReviewAction.APPROVE)
                .comments(note).build();
        if (row instanceof Submission submission) {
            review.setSubmission(submission);
            review.setContentSnapshot(submission.getContent());
            events.record(submission, Submission.SubmissionStatus.valueOf(next),
                    deputy ? SubmissionEvent.Actor.DEPUTY_EIC : SubmissionEvent.Actor.EIC,
                    reject ? "Lãnh đạo từ chối nội dung." : escalate ? "Chuyển Tổng biên tập phê duyệt." : "Nội dung đã được phê duyệt, sẵn sàng xuất bản.", note);
        } else {
            ResearchArticle article = (ResearchArticle) row;
            review.setResearchArticle(article);
            review.setContentSnapshot(article.getContent());
            article.setReviewStatus(ResearchArticle.ReviewStatus.valueOf(next));
        }
        reviews.save(review);
        return view(row);
    }

    private Object find(String kind, Long id, boolean lock) {
        Class<?> type = switch(kind) {
            case "submissions" -> Submission.class;
            case "research" -> ResearchArticle.class;
            default -> throw AppException.badRequest("Loại nội dung không hợp lệ.");
        };
        Object row = lock ? em.find(type, id, LockModeType.PESSIMISTIC_WRITE) : em.find(type, id);
        if (row == null) throw AppException.notFound("Không tìm thấy nội dung.");
        if (row instanceof ResearchArticle a && a.getStatus() == ResearchArticle.Status.DRAFT)
            throw AppException.notFound("Không tìm thấy nội dung đã nộp.");
        return row;
    }

    private void requireResponsible(User user, Object row) {
        if (user.getRole() == User.Role.EIC) return;
        boolean responsible;
        if (row instanceof Submission s) {
            responsible = s.getCategory() != null && s.getCategory().getDeputyEic() != null
                    && user.getId().equals(s.getCategory().getDeputyEic().getId());
        } else {
            responsible = em.createQuery("select count(c) from Category c where c.name=:field and c.deputyEic.id=:user", Long.class)
                    .setParameter("field", ((ResearchArticle)row).getField()).setParameter("user", user.getId()).getSingleResult() > 0;
        }
        if (!responsible) throw AppException.forbidden("Nội dung không thuộc chuyên mục bạn phụ trách.", ErrorCode.FORBIDDEN);
    }

    private Content view(Object row) {
        if (row instanceof Submission s) return new Content("submissions", s.getId(), s.getTrackingCode(), s.getTitle(), s.getContent(),
                s.getIsAnonymous() ? "Người gửi ẩn danh" : s.getAuthor().getFullName(), s.getCategory() == null ? "" : s.getCategory().getName(),
                String.valueOf(s.getPriority()), s.getStatus().name());
        ResearchArticle a = (ResearchArticle) row;
        return new Content("research", a.getId(), "NC-" + a.getId(), a.getTitle(), a.getContent(), a.getAuthor().getFullName(), a.getField(), String.valueOf(a.getPriority()), String.valueOf(a.getReviewStatus()));
    }
}
