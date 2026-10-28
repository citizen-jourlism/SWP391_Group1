package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.UserViolation;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserViolationRepository extends JpaRepository<UserViolation, Long> {

    @EntityGraph(attributePaths = {"reportedUser", "reportedBy", "relatedSubmission", "reviewedBy", "approvedBy"})
    @Query("""
            select v from UserViolation v
            where (:status is null or v.status = :status)
              and (:type is null or v.type = :type)
              and (:action is null or v.proposedAction = :action)
              and (:keyword is null
                   or lower(v.reportedUser.fullName) like lower(concat('%', :keyword, '%'))
                   or lower(v.reportedUser.id) like lower(concat('%', :keyword, '%'))
                   or lower(v.reportedUser.email) like lower(concat('%', :keyword, '%')))
            """)
    Page<UserViolation> search(@Param("status") UserViolation.Status status,
                               @Param("type") UserViolation.Type type,
                               @Param("action") UserViolation.Action action,
                               @Param("keyword") String keyword,
                               Pageable pageable);

    @EntityGraph(attributePaths = {"reportedUser", "reportedBy", "relatedSubmission", "reviewedBy", "approvedBy"})
    Optional<UserViolation> findWithDetailsById(Long id);

    long countByStatus(UserViolation.Status status);
}
