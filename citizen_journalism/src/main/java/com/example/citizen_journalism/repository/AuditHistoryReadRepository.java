
package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.dto.audit.AuditHistoryItem;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Repository;

/** Only reads existing submission_events and reputation_logs; writes nothing. */
@Repository
public class AuditHistoryReadRepository {

    @PersistenceContext
    private EntityManager entityManager;

    private static final String HISTORY_SQL = """
        SELECT 'SUBMISSION' AS source, e.id AS row_id, e.created_at AS occurred_at,
               e.actor AS actor_role, e.status AS action, e.description AS description,
               CAST(e.submission_id AS CHAR) AS target_id
        FROM submission_events e
        UNION ALL
        SELECT 'REPUTATION' AS source, r.id AS row_id, r.created_at AS occurred_at,
               NULL AS actor_role, r.reason AS action,
               CONCAT('Thay đổi điểm: ', r.points_change) AS description,
               CAST(r.user_id AS CHAR) AS target_id
        FROM reputation_logs r
        """;

    private static final String FILTER_SQL = """
        WHERE (:source IS NULL OR h.source = :source)
          AND (:fromTime IS NULL OR h.occurred_at >= :fromTime)
          AND (:toTime IS NULL OR h.occurred_at <= :toTime)
        """;

    private Query filteredQuery(
            String sql,
            String source,
            LocalDateTime fromTime,
            LocalDateTime toTime) {

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("source", source);
        query.setParameter("fromTime", fromTime);
        query.setParameter("toTime", toTime);
        return query;
    }

    public long count(
            String source,
            LocalDateTime fromTime,
            LocalDateTime toTime) {

        String sql = "SELECT COUNT(*) FROM (" + HISTORY_SQL + ") h "
                + FILTER_SQL;

        Number value = (Number) filteredQuery(
                sql, source, fromTime, toTime).getSingleResult();

        return value.longValue();
    }

    @SuppressWarnings("unchecked")
    public List<AuditHistoryItem> list(
            String source,
            LocalDateTime fromTime,
            LocalDateTime toTime,
            int offset,
            int limit) {

        String sql =
                "SELECT h.source, h.row_id, h.occurred_at, h.actor_role, h.action, "
                + "h.description, h.target_id FROM (" + HISTORY_SQL + ") h "
                + FILTER_SQL
                + " ORDER BY h.occurred_at DESC, h.source ASC, h.row_id DESC";

        Query query = filteredQuery(sql, source, fromTime, toTime);
        query.setFirstResult(offset);
        query.setMaxResults(limit);

        List<Object[]> rows = query.getResultList();

        return rows.stream().map(this::mapRow).toList();
    }

    private AuditHistoryItem mapRow(Object[] row) {
        Object date = row[2];

        LocalDateTime occurredAt = date instanceof LocalDateTime time
                ? time
                : ((Timestamp) date).toLocalDateTime();

        return new AuditHistoryItem(
                (String) row[0],
                ((Number) row[1]).longValue(),
                occurredAt,
                (String) row[3],
                (String) row[4],
                (String) row[5],
                (String) row[6]
        );
    }
}
