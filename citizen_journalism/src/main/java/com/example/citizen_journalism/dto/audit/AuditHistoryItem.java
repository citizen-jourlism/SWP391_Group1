package com.example.citizen_journalism.dto.audit;

import java.time.LocalDateTime;

public record AuditHistoryItem(
    String source,
    Long id,
    LocalDateTime occurredAt,
    String actorRole,
    String action,
    String description,
    String targetId
) {}
