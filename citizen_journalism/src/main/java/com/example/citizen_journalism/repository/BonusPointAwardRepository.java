package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.BonusPointAward;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BonusPointAwardRepository extends JpaRepository<BonusPointAward, Long> {

    boolean existsByContributionTypeAndContributionId(BonusPointAward.ContributionType type, Long contributionId);
}
