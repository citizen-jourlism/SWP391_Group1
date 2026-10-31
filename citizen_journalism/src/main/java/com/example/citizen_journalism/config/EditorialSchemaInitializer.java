package com.example.citizen_journalism.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Legacy installations required submission_id even for research reviews. */
@Component
@Order(-100)
@RequiredArgsConstructor
public class EditorialSchemaInitializer implements ApplicationRunner {
    private final JdbcTemplate jdbc;
    @Override
    public void run(ApplicationArguments arguments) {
        jdbc.update("update user_violations set version=0 where version is null");
        var columns = jdbc.queryForList("""
                select COLUMN_TYPE from information_schema.COLUMNS
                where TABLE_SCHEMA=database() and TABLE_NAME='editorial_reviews'
                  and COLUMN_NAME='submission_id' and IS_NULLABLE='NO'
                """, String.class);
        if (!columns.isEmpty()) {
            String type = columns.get(0);
            if (!type.matches("(?i)bigint(\\(\\d+\\))?( unsigned)?"))
                throw new IllegalStateException("Unexpected editorial_reviews.submission_id type: " + type);
            jdbc.execute("alter table editorial_reviews modify column submission_id " + type + " null");
        }
    }
}
