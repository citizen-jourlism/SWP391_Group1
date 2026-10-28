package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.ViolationAppeal;
import java.util.Collection;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ViolationAppealRepository extends JpaRepository<ViolationAppeal, Long> {

    @EntityGraph(attributePaths = {"user", "reviewedBy", "decidedBy"})
    @Query("""
            select a from ViolationAppeal a
            where (:status is null or a.status = :status)
              and (:keyword is null
                   or lower(a.user.fullName) like lower(concat('%', :keyword, '%'))
                   or lower(a.user.id) like lower(concat('%', :keyword, '%'))
                   or lower(a.user.email) like lower(concat('%', :keyword, '%')))
            """)
    Page<ViolationAppeal> search(@Param("status") ViolationAppeal.Status status,
                                 @Param("keyword") String keyword,
                                 Pageable pageable);

    @EntityGraph(attributePaths = {"user", "reviewedBy", "decidedBy"})
    Optional<ViolationAppeal> findWithDetailsById(Long id);

    boolean existsByUserIdAndStatusIn(String userId, Collection<ViolationAppeal.Status> statuses);
}
