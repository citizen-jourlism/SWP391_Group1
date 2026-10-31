package com.example.citizen_journalism.config;

import com.example.citizen_journalism.entity.User;
import com.example.citizen_journalism.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReputationScoreInitializer implements ApplicationRunner {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        int cappedAccounts = userRepository.capReputationScores(User.MAX_REPUTATION_SCORE);
        if (cappedAccounts > 0) {
            log.info("Capped reputation scores at {} for {} account(s).",
                    User.MAX_REPUTATION_SCORE, cappedAccounts);
        }
    }
}
