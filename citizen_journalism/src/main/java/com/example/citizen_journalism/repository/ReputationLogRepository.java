package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.ReputationLog;
import com.example.citizen_journalism.entity.Submission;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReputationLogRepository extends JpaRepository<ReputationLog, Long> {

    List<ReputationLog> findTop20ByUserIdOrderByCreatedAtDesc(String userId);

    boolean existsByContributionTypeAndContributionId(ReputationLog.ContributionType type, Long contributionId);

    /** Các lần cộng / trừ điểm gắn với 1 hồ sơ (ví dụ trừ điểm khi hồ sơ bị từ chối vì tin rác). */
    List<ReputationLog> findByRelatedSubmission(Submission submission);
}
