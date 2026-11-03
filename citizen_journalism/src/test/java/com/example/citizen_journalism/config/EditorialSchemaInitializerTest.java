package com.example.citizen_journalism.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** EditorialSchemaInitializer chỉ sửa cột khi cần, DB đã đúng thì chỉ đọc. */
class EditorialSchemaInitializerTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final EditorialSchemaInitializer initializer = new EditorialSchemaInitializer(jdbc);

    @Test
    void compatibleDatabaseIsOnlyRead() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class))).thenReturn(0);
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString(), anyString())).thenReturn(0);

        initializer.run(new DefaultApplicationArguments());

        verify(jdbc, never()).execute(anyString());
    }

    @Test
    void requiredSubmissionColumnBecomesNullable() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class))).thenReturn(1);
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString(), anyString())).thenReturn(0);

        initializer.run(new DefaultApplicationArguments());

        verify(jdbc).execute("alter table editorial_reviews modify column submission_id bigint null");
        verify(jdbc, times(1)).execute(anyString());
    }

    @Test
    void enumColumnsBecomeVarchar() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class))).thenReturn(0);
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString(), anyString())).thenReturn(1);

        initializer.run(new DefaultApplicationArguments());

        verify(jdbc).execute(contains("alter table reputation_logs modify column reason varchar(100)"));
        verify(jdbc).execute(contains("alter table research_articles modify column status varchar(20)"));
    }
}
