package com.example.citizen_journalism.service;

import com.example.citizen_journalism.dto.PageResponse;
import com.example.citizen_journalism.entity.*;
import com.example.citizen_journalism.exception.*;
import com.example.citizen_journalism.repository.UserRepository;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor
public class ExpertApplicationService {
    private final EntityManager em;
    private final UserRepository users;
    private final MailService mail;
    public record Apply(@NotBlank @Size(max=100) String field,
            @NotBlank @Size(min=20,max=3000) String qualifications,
            @NotBlank @Size(max=2000) String evidence) {}
    public record Review(@NotNull Boolean approve, @Size(max=2000) String note) {}
    public record View(Long id, String userId, String fullName, String field, String qualifications,
            String evidence, String status, String note, String reviewer, LocalDateTime createdAt, LocalDateTime reviewedAt) {}

    @Transactional(readOnly=true)
    public List<View> mine(String userId) {
        return em.createQuery("select a from ExpertApplication a where a.applicant.id=:user order by a.id desc", ExpertApplication.class)
                .setParameter("user",userId).getResultList().stream().map(this::view).toList();
    }
    @Transactional
    public View apply(String userId, Apply request) {
        User user = users.getActiveById(userId);
        em.lock(user, LockModeType.PESSIMISTIC_WRITE);
        if (user.getRole()!=User.Role.CITIZEN && user.getRole()!=User.Role.CONTRIBUTOR)
            throw AppException.forbidden("Chỉ người dân hoặc cộng tác viên được đăng ký chuyên gia.", ErrorCode.FORBIDDEN);
        long count = em.createQuery("select count(a) from ExpertApplication a where a.applicant.id=:user and a.status='PENDING'",Long.class)
                .setParameter("user",userId).getSingleResult();
        if(count>0) throw AppException.conflict("Bạn đang có đơn chuyên gia chờ xét duyệt.");
        ExpertApplication row=new ExpertApplication();
        row.setApplicant(user); row.setField(request.field().trim()); row.setQualifications(request.qualifications().trim());
        row.setEvidence(request.evidence().trim()); row.setStatus("PENDING"); em.persist(row); em.flush();
        return view(row);
    }
    @Transactional(readOnly=true)
    public PageResponse<View> list(String status,int page,int size) {
        int p=Math.max(0,page), n=Math.min(100,Math.max(1,size));
        String where=status==null || status.isBlank() ? "" : " where a.status=:status";
        var query=em.createQuery("select a from ExpertApplication a"+where+" order by a.id desc",ExpertApplication.class);
        var counter=em.createQuery("select count(a) from ExpertApplication a"+where,Long.class);
        if(!where.isEmpty()) { query.setParameter("status",status); counter.setParameter("status",status); }
        long total=counter.getSingleResult();
        return new PageResponse<>(query.setFirstResult(p*n).setMaxResults(n).getResultList().stream().map(this::view).toList(),p,n,total,(int)((total+n-1)/n));
    }
    @Transactional
    public View review(String editorId,Long id,Review request) {
        User editor=users.getActiveById(editorId);
        if(editor.getRole()!=User.Role.EDITOR) throw AppException.forbidden("Chỉ biên tập viên được xét đơn.",ErrorCode.FORBIDDEN);
        ExpertApplication row=em.find(ExpertApplication.class,id,LockModeType.PESSIMISTIC_WRITE);
        if(row==null) throw AppException.notFound("Không tìm thấy đơn.");
        if(!"PENDING".equals(row.getStatus())) throw AppException.conflict("Đơn đã được xét.");
        String note=request.note()==null ? "" : request.note().trim();
        if(!request.approve() && note.length()<10) throw AppException.badRequest("Lý do từ chối cần ít nhất 10 ký tự.");
        User applicant=row.getApplicant(); em.lock(applicant,LockModeType.PESSIMISTIC_WRITE);
        if(request.approve()) {
            if(applicant.getStatus()!=User.Status.ACTIVE || (applicant.getRole()!=User.Role.CITIZEN && applicant.getRole()!=User.Role.CONTRIBUTOR))
                throw AppException.conflict("Tài khoản không còn đủ điều kiện nâng cấp.");
            Long activeTasks=em.createQuery("select count(a) from FieldAssignment a where a.contributor.id=:user and a.status not in :terminal",Long.class)
                    .setParameter("user",applicant.getId()).setParameter("terminal",List.of(FieldAssignment.AssignmentStatus.COMPLETED,FieldAssignment.AssignmentStatus.CANCELLED)).getSingleResult();
            if(activeTasks>0) throw AppException.conflict("Cần kết thúc các nhiệm vụ hiện trường trước khi nâng cấp chuyên gia.");
            applicant.setRole(User.Role.EXPERT);
            applicant.setExpertiseFields(row.getField());
        }
        row.setStatus(request.approve()?"APPROVED":"REJECTED"); row.setReviewer(editor); row.setNote(note); row.setReviewedAt(LocalDateTime.now());
        mail.trySend(applicant.getEmail(),"Kết quả đăng ký chuyên gia",MailService.layout("<p>Đơn chuyên gia: "+row.getStatus()+"</p><p>"+MailService.escape(note)+"</p>"));
        return view(row);
    }
    private View view(ExpertApplication a) { return new View(a.getId(),a.getApplicant().getId(),a.getApplicant().getFullName(),a.getField(),a.getQualifications(),a.getEvidence(),a.getStatus(),a.getNote(),a.getReviewer()==null?null:a.getReviewer().getFullName(),a.getCreatedAt(),a.getReviewedAt()); }
}
