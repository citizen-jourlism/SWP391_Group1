package com.example.citizen_journalism.service;

import com.example.citizen_journalism.entity.BonusPointAward;
import com.example.citizen_journalism.entity.ResearchArticle;
import com.example.citizen_journalism.entity.Submission;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.repository.BonusPointAwardRepository;
import com.example.citizen_journalism.repository.ResearchArticleRepository;
import com.example.citizen_journalism.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ContributionPointService {

    private static final int BATCH_PAGE_SIZE = 200;

    private final SubmissionRepository submissionRepository;
    private final ResearchArticleRepository researchArticleRepository;
    private final BonusPointAwardRepository awardRepository;

    @Transactional
    public AwardSummary accumulate(int citizenPoints, int expertPoints) {
        int citizenAwards = awardCitizenSubmissions(citizenPoints);
        int expertAwards = awardExpertArticles(expertPoints);
        return new AwardSummary(citizenAwards, expertAwards);
    }

    private int awardCitizenSubmissions(int points) {
        return processPages(
                page -> submissionRepository.findByStatusAndAuthorRole(Submission.SubmissionStatus.PUBLISHED,
                        User.Role.CITIZEN, page),
                item -> award(item.getId(), BonusPointAward.ContributionType.CITIZEN_SUBMISSION,
                        item.getAuthor(), points));
    }

    private int awardExpertArticles(int points) {
        return processPages(
                page -> researchArticleRepository.findByStatusAndAuthorRole(ResearchArticle.Status.APPROVED,
                        User.Role.EXPERT, page),
                item -> award(item.getId(), BonusPointAward.ContributionType.EXPERT_RESEARCH_ARTICLE,
                        item.getAuthor(), points));
    }

    private <T> int processPages(java.util.function.Function<PageRequest, Page<T>> pageQuery,
                                 java.util.function.ToIntFunction<T> awardItem) {
        int pageNumber = 0;
        int awardCount = 0;
        Page<T> page;
        do {
            page = pageQuery.apply(PageRequest.of(pageNumber++, BATCH_PAGE_SIZE, Sort.by("id").ascending()));
            for (T item : page.getContent()) {
                awardCount += awardItem.applyAsInt(item);
            }
        } while (page.hasNext());
        return awardCount;
    }

    private int award(Long contributionId, BonusPointAward.ContributionType type, User user, int points) {
        if (awardRepository.existsByContributionTypeAndContributionId(type, contributionId)) {
            return 0;
        }
        user.setRewardPoints(Math.addExact(user.getRewardPoints(), points));
        awardRepository.save(BonusPointAward.builder()
                .user(user)
                .contributionType(type)
                .contributionId(contributionId)
                .points(points)
                .build());
        return 1;
    }

    public record AwardSummary(int citizenAwards, int expertAwards) {
        public int totalAwards() {
            return citizenAwards + expertAwards;
        }
    }
}
