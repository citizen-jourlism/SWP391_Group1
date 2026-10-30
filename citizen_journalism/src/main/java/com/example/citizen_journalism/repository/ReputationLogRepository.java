package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.ReputationLog;
import org.springframework.data.jpa.repository.JpaRepository;

/** REPOSITORY cho bảng "reputation_logs" (lịch sử cộng / trừ điểm). Dùng ở FieldReportService. */
public interface ReputationLogRepository extends JpaRepository<ReputationLog, Long> {
}
