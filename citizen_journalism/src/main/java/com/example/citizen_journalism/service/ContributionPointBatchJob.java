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

    @Value("${app.bonus-points.citizen:5}")
    private int citizenPoints;

    @Value("${app.bonus-points.expert:10}")
    private int expertPoints;

    @PostConstruct
    void validateConfiguration() {
        if (citizenPoints <= 0 || expertPoints <= 0) {
            throw new IllegalStateException("Bonus point awards must be positive integers.");
        }
    }

    @Scheduled(cron = "${app.bonus-points.cron:0 5 0 * * *}", zone = "Asia/Ho_Chi_Minh")
    public void accumulateContributionPoints() {
        ContributionPointService.AwardSummary result =
                contributionPointService.accumulate(citizenPoints, expertPoints);
        log.info("Contribution bonus batch completed: {} Citizen awards, {} Expert awards ({} total).",
                result.citizenAwards(), result.expertAwards(), result.totalAwards());
    }
}
