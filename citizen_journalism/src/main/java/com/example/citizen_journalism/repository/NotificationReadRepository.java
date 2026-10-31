
package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.ContributorApplication;
import com.example.citizen_journalism.entity.SubmissionEvent;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.List;
import org.springframework.stereotype.Repository;

/** Đọc dữ liệu đã có, không thay đổi cấu trúc Database. */
@Repository
public class NotificationReadRepository {

    @PersistenceContext
    private EntityManager entityManager;

    public List<SubmissionEvent> submissionEvents(String userId) {
        return entityManager.createQuery("""
            SELECT e FROM SubmissionEvent e
            JOIN FETCH e.submission s
            WHERE s.author.id = :userId
              AND e.actor <> :reporter
            ORDER BY e.createdAt DESC, e.id DESC
            """, SubmissionEvent.class)
            .setParameter("userId", userId)
            .setParameter(
                "reporter",
                SubmissionEvent.Actor.REPORTER
            )
            .setMaxResults(100)
            .getResultList();
    }

    public List<ContributorApplication> applications(String userId) {
        return entityManager.createQuery("""
            SELECT a FROM ContributorApplication a
            WHERE a.applicant.id = :userId
            ORDER BY a.createdAt DESC, a.id DESC
            """, ContributorApplication.class)
            .setParameter("userId", userId)
            .setMaxResults(50)
            .getResultList();
    }
}
