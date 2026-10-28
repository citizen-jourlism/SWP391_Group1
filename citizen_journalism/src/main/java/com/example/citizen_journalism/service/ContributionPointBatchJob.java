package com.example.citizen_journalism.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ContributionPointBatchJob {

    private final ContributionPointService contributionPointService;

    @Value("${app.reputation-points.citizen:5}")
    private int citizenPoints;

    @Value("${app.reputation-points.expert:10}")
    private int expertPoints;

    @PostConstruct
    void validateConfiguration() {
        if (citizenPoints <= 0 || expertPoints <= 0) {
            throw new IllegalStateException("Reputation point awards must be positive integers.");
        }
    }

    @Scheduled(cron = "${app.reputation-points.cron:0 5 0 * * *}", zone = "Asia/Ho_Chi_Minh")
    public void accumulateContributionPoints() {
        ContributionPointService.AwardSummary result =
                contributionPointService.accumulate(citizenPoints, expertPoints);
        log.info("Contribution reputation batch completed: {} Citizen awards, {} Expert awards ({} total).",
                result.citizenAwards(), result.expertAwards(), result.totalAwards());
    }
}
