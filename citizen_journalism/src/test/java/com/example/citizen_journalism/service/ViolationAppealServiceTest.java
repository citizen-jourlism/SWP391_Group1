package com.example.citizen_journalism.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.citizen_journalism.dto.violation.DecideAppealRequest;
import com.example.citizen_journalism.entity.ReputationLog;
import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.entity.ViolationAppeal;
import com.example.citizen_journalism.exception.AppException;
import com.example.citizen_journalism.repository.ReputationLogRepository;
import com.example.citizen_journalism.repository.UserRepository;
import com.example.citizen_journalism.repository.ViolationAppealRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

class ViolationAppealServiceTest {

    private final ViolationAppealRepository appealRepository = mock(ViolationAppealRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final ReputationLogRepository reputationLogRepository = mock(ReputationLogRepository.class);
    private final ViolationAppealService service = new ViolationAppealService(
            appealRepository,
            userRepository,
            reputationLogRepository,
            mock(PasswordEncoder.class),
            mock(MailService.class));

    @Test
    void deputyApprovalRestoresReputationToEightyOneAndUnlocksCitizen() {
        User citizen = user("CT0001", User.Role.CITIZEN, User.Status.LOCKED, 64);
        User deputy = user("DE0001", User.Role.DEPUTY_EIC, User.Status.ACTIVE, 100);
        ViolationAppeal appeal = appeal(citizen);
        when(appealRepository.findWithDetailsById(1L)).thenReturn(java.util.Optional.of(appeal));
        when(userRepository.getActiveById(deputy.getId())).thenReturn(deputy);

        var result = service.decide(deputy.getId(), 1L,
                new DecideAppealRequest(DecideAppealRequest.Decision.APPROVE, null));

        assertEquals(ViolationAppeal.Status.APPROVED, result.status());
        assertEquals(81, citizen.getReputationScore());
        assertEquals(User.Status.ACTIVE, citizen.getStatus());
        verify(reputationLogRepository).save(any(ReputationLog.class));
    }

    @Test
    void eicCannotDecideUnlockAppeal() {
        User citizen = user("CT0001", User.Role.CITIZEN, User.Status.LOCKED, 64);
        User eic = user("EC0001", User.Role.EIC, User.Status.ACTIVE, 100);
        when(appealRepository.findWithDetailsById(1L)).thenReturn(java.util.Optional.of(appeal(citizen)));
        when(userRepository.getActiveById(eic.getId())).thenReturn(eic);

        AppException error = assertThrows(AppException.class, () -> service.decide(eic.getId(), 1L,
                new DecideAppealRequest(DecideAppealRequest.Decision.APPROVE, null)));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        assertEquals(64, citizen.getReputationScore());
        assertEquals(User.Status.LOCKED, citizen.getStatus());
    }

    private static ViolationAppeal appeal(User citizen) {
        ViolationAppeal appeal = ViolationAppeal.builder()
                .user(citizen)
                .reason("Tài khoản của tôi bị khóa nhầm, xin được xem xét lại.")
                .status(ViolationAppeal.Status.PENDING_FINAL)
                .build();
        appeal.setId(1L);
        return appeal;
    }

    private static User user(String id, User.Role role, User.Status status, int score) {
        return User.builder()
                .id(id)
                .role(role)
                .status(status)
                .fullName(id)
                .email(id.toLowerCase() + "@example.test")
                .reputationScore(score)
                .build();
    }
}
