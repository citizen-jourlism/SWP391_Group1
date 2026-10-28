package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.ReputationLog;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReputationLogRepository extends JpaRepository<ReputationLog, Long> {

    List<ReputationLog> findTop20ByUserIdOrderByCreatedAtDesc(String userId);
}
