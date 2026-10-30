package com.example.citizen_journalism.job;

import com.example.citizen_journalism.entity.User;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Iteration 2 / TungTT: read-only snapshot of Citizen reputation and
 * Contributor activity. Does not calculate, award, or deduct scores.
 *
 * No timer is registered: the team must approve a schedule or trigger separately.
 */
@Component
public class UserPerformanceJob {

    private final EntityManager entityManager;

    public UserPerformanceJob(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public record PerformanceSnapshot(
            String userId,
            String fullName,
            User.Role role,
            Integer reputationScore,
            long totalSubmissions,
            long publishedSubmissions,
            long totalAssignments,
            long completedAssignments
    ) { }

    @Transactional(readOnly = true)
    public List<PerformanceSnapshot> evaluate() {
        Map<String, MutableStats> stats = new LinkedHashMap<>();

        List<Object[]> users = entityManager.createQuery("""
                select u.id, u.fullName, u.role, u.reputationScore
                from User u
                where u.role in :roles
                order by u.id
                """, Object[].class)
                .setParameter("roles", List.of(User.Role.CITIZEN, User.Role.CONTRIBUTOR))
                .getResultList();

        for (Object[] row : users) {
            String id = (String) row[0];
            stats.put(id, new MutableStats(
                    id, (String) row[1], (User.Role) row[2], (Integer) row[3]));
        }

        List<Object[]> submissionCounts = entityManager.createQuery("""
                select s.author.id, s.status, count(s.id)
                from Submission s
                where s.author.role in :roles
                group by s.author.id, s.status
                """, Object[].class)
                .setParameter("roles", List.of(User.Role.CITIZEN, User.Role.CONTRIBUTOR))
                .getResultList();

        for (Object[] row : submissionCounts) {
            MutableStats item = stats.get((String) row[0]);
            if (item == null) continue;
            long count = (Long) row[2];
            item.totalSubmissions += count;
            if (row[1] == com.example.citizen_journalism.entity.Submission.SubmissionStatus.PUBLISHED) {
                item.publishedSubmissions += count;
            }
        }

        List<Object[]> assignmentCounts = entityManager.createQuery("""
                select a.contributor.id, a.status, count(a.id)
                from FieldAssignment a
                where a.contributor is not null
                  and a.contributor.role = :contributorRole
                group by a.contributor.id, a.status
                """, Object[].class)
                .setParameter("contributorRole", User.Role.CONTRIBUTOR)
                .getResultList();

        for (Object[] row : assignmentCounts) {
            MutableStats item = stats.get((String) row[0]);
            if (item == null) continue;
            long count = (Long) row[2];
            item.totalAssignments += count;
            if (row[1] == com.example.citizen_journalism.entity.FieldAssignment.AssignmentStatus.COMPLETED) {
                item.completedAssignments += count;
            }
        }

        List<PerformanceSnapshot> result = new ArrayList<>(stats.size());
        for (MutableStats item : stats.values()) {
            result.add(new PerformanceSnapshot(
                    item.userId, item.fullName, item.role, item.reputationScore,
                    item.totalSubmissions, item.publishedSubmissions,
                    item.totalAssignments, item.completedAssignments));
        }
        return List.copyOf(result);
    }

    private static final class MutableStats {
        final String userId;
        final String fullName;
        final User.Role role;
        final Integer reputationScore;
        long totalSubmissions;
        long publishedSubmissions;
        long totalAssignments;
        long completedAssignments;

        MutableStats(String userId, String fullName, User.Role role, Integer reputationScore) {
            this.userId = userId;
            this.fullName = fullName;
            this.role = role;
            this.reputationScore = reputationScore;
        }
    }
}