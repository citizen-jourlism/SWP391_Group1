package com.example.citizen_journalism.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Checks compatibility without changing the existing schema or records. */
@Component
@Order(-100)
@RequiredArgsConstructor
public class EditorialSchemaInitializer implements ApplicationRunner {
    private final JdbcTemplate jdbc;
    @Override
    public void run(ApplicationArguments arguments) {
        var columns = jdbc.queryForList("""
                select IS_NULLABLE from information_schema.COLUMNS
                where TABLE_SCHEMA=database() and TABLE_NAME='editorial_reviews'
                  and COLUMN_NAME='submission_id' and IS_NULLABLE='NO'
                """, String.class);
        if (!columns.isEmpty()) {
            throw new IllegalStateException("Research reviews require nullable editorial_reviews.submission_id. "
                    + "The database was left unchanged.");
        }
        Long invalidVersions = jdbc.queryForObject(
                "select count(*) from submissions where record_kind='ACCOUNT_VIOLATION' and workflow_version is null", Long.class);
        if (invalidVersions != null && invalidVersions > 0) {
            throw new IllegalStateException("Account violation submissions contain null versions. "
                    + "The database was left unchanged.");
        }
    }
}
