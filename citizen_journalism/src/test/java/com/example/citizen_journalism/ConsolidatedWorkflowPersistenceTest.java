package com.example.citizen_journalism;

import com.example.citizen_journalism.dto.violation.*;
import com.example.citizen_journalism.entity.*;
import com.example.citizen_journalism.repository.*;
import com.example.citizen_journalism.service.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

/** Write tests run only in the disposable database, and roll back every transaction. */
@EnabledIfEnvironmentVariable(named="WORKFLOW_WRITE_TEST_DB", matches="citizen_journalism_verify_13")
@SpringBootTest(properties={"app.mail.enabled=false", "spring.jpa.show-sql=false"})
@Transactional
class ConsolidatedWorkflowPersistenceTest {
    @Autowired EntityManager em;
    @Autowired JdbcTemplate jdbc;
    @Autowired PasswordEncoder encoder;
    @Autowired ExpertApplicationService experts;
    @Autowired UserViolationService violations;
    @Autowired ViolationAppealService appeals;
    @Autowired SubmissionRepository submissions;
    @Autowired ContributorApplicationRepository contributors;
    @Autowired UserViolationRepository violationRepository;
    @Autowired ViolationAppealRepository appealRepository;

    @BeforeEach
    void fixtures() {
        assertEquals("citizen_journalism_verify_13", jdbc.queryForObject("select database()", String.class));
        user("TC9001", User.Role.CITIZEN, User.Status.ACTIVE);
        user("TE9001", User.Role.EDITOR, User.Status.ACTIVE);
        user("TD9001", User.Role.DEPUTY_EIC, User.Status.ACTIVE);
        em.flush();
    }

    @Test
    void expertApplicationCanBeSubmittedAndApprovedWithoutEnteringContributorQueue() {
        long before = contributors.count();
        var created=experts.apply("TC9001",new ExpertApplicationService.Apply(
                "Science", "Qualifications and relevant research experience", "https://example.com/proof"));
        em.flush(); em.clear();
        assertEquals("PENDING",experts.mine("TC9001").get(0).status());
        assertEquals("https://example.com/proof",experts.mine("TC9001").get(0).evidence());
        assertEquals(1, experts.list("PENDING",0,10).items().stream().filter(v -> v.id().equals(created.id())).count());
        assertEquals(before, contributors.count());
        experts.review("TE9001",created.id(),new ExpertApplicationService.Review(true,"Verified credentials"));
        em.flush(); em.clear();
        assertEquals("APPROVED",experts.mine("TC9001").get(0).status());
        assertEquals(User.Role.EXPERT,em.find(User.class,"TC9001").getRole());
        assertEquals(before,contributors.count());
    }

    @Test
    void violationCanBeReviewedAndApprovedWithoutEnteringContentQueue() {
        long before=submissions.count();
        var created=violations.create("TE9001",new CreateViolationRequest("TC9001",null,
                UserViolation.Type.SPAM,UserViolation.Severity.HIGH,"Repeated policy violations with evidence", "Evidence note"));
        em.flush(); em.clear();
        assertEquals(UserViolation.Type.SPAM,violations.get(created.id()).type());
        violations.review("TE9001",created.id(),new ReviewViolationRequest(
                ReviewViolationRequest.Decision.ESCALATE,UserViolation.Action.LOCK_ACCOUNT,null,"Repeated confirmed violations"));
        em.flush(); em.clear();
        assertTrue(violationRepository.search(UserViolation.Status.PENDING_APPROVAL,UserViolation.Type.SPAM,
                UserViolation.Action.LOCK_ACCOUNT,"TC9001",org.springframework.data.domain.PageRequest.of(0,20))
                .stream().anyMatch(v -> v.getId().equals(created.id())));
        violations.approve("TD9001",created.id(),new ApproveViolationRequest(
                ApproveViolationRequest.Decision.APPROVE,null,"Confirmed by deputy"));
        em.flush(); em.clear();
        assertEquals(User.Status.LOCKED,em.find(User.class,"TC9001").getStatus());
        assertEquals(UserViolation.Status.RESOLVED,violations.get(created.id()).status());
        assertEquals(before,submissions.count());
        assertTrue(submissions.findById(created.id()).isEmpty());
    }

    @Test
    void appealCanBeForwardedAndApprovedWithoutEnteringContentQueue() {
        long before=submissions.count();
        em.find(User.class,"TC9001").setStatus(User.Status.LOCKED);
        em.flush();
        var created=appeals.create(new CreateAppealRequest("TC9001@workflow.invalid","test-password",
                "Please review my account suspension with these supporting facts.","Supporting evidence"));
        em.flush(); em.clear();
        assertTrue(appealRepository.existsByUserIdAndStatusIn("TC9001",java.util.List.of(ViolationAppeal.Status.PENDING_EDITOR)));
        appeals.review("TE9001",created.id(),new ReviewAppealRequest(ReviewAppealRequest.Decision.FORWARD,"Verified appeal"));
        em.flush(); em.clear();
        assertEquals(ViolationAppeal.Status.PENDING_FINAL,appeals.get(created.id()).status());
        appeals.decide("TD9001",created.id(),new DecideAppealRequest(DecideAppealRequest.Decision.APPROVE,"Appeal accepted"));
        em.flush(); em.clear();
        assertEquals(ViolationAppeal.Status.APPROVED,appeals.get(created.id()).status());
        assertEquals(User.Status.ACTIVE,em.find(User.class,"TC9001").getStatus());
        assertEquals(81,em.find(User.class,"TC9001").getReputationScore());
        assertEquals(before,submissions.count());
    }

    @Test
    void originalContentAndContributorApplicationsKeepTheirOwnQueues() {
        long violationCount=violationRepository.countByStatus(UserViolation.Status.PENDING_REVIEW);
        Submission content=Submission.builder().author(em.find(User.class,"TC9001"))
                .type(Submission.SubmissionType.HOT_NEWS).title("Ordinary citizen report")
                .content("Ordinary citizen report contents").status(Submission.SubmissionStatus.PENDING).build();
        em.persist(content);
        ContributorApplication application=ContributorApplication.builder().applicant(em.find(User.class,"TC9001"))
                .status(ContributorApplication.Status.PENDING_EDITOR).expertiseFields("Science")
                .province("Ha Noi").occupation("Reporter").availability(ContributorApplication.Availability.PART_TIME)
                .experience("Experience reporting on local events").documents("[]").build();
        em.persist(application);
        em.flush(); em.clear();
        assertTrue(submissions.findById(content.getId()).isPresent());
        assertTrue(contributors.findById(application.getId()).isPresent());
        assertNull(em.find(UserViolation.class,content.getId()));
        assertNull(em.find(ViolationAppeal.class,content.getId()));
        assertNull(em.find(ExpertApplication.class,application.getId()));
        assertEquals(violationCount,violationRepository.countByStatus(UserViolation.Status.PENDING_REVIEW));
    }

    @Test
    void migratedRecordsKeepTheirPublicIds() {
        jdbc.query("select workflow_legacy_id,content from submissions where record_kind='ACCOUNT_VIOLATION'",
                (org.springframework.jdbc.core.RowCallbackHandler) rs -> assertEquals(rs.getString("content"),
                        violations.get(rs.getLong("workflow_legacy_id")).description()));
        jdbc.query("select workflow_legacy_id,content from submissions where record_kind='ACCOUNT_APPEAL'",
                (org.springframework.jdbc.core.RowCallbackHandler) rs -> assertEquals(rs.getString("content"),
                        appeals.get(rs.getLong("workflow_legacy_id")).reason()));
    }

    private void user(String id,User.Role role,User.Status status) {
        em.persist(User.builder().id(id).role(role).status(status).fullName("Workflow test " + id)
                .email(id+"@workflow.invalid").phone("090"+id).passwordHash(encoder.encode("test-password"))
                .reputationScore(100).build());
    }
}
