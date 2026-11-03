package com.example.citizen_journalism.config;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class EditorialSchemaInitializerTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final EditorialSchemaInitializer initializer = new EditorialSchemaInitializer(jdbc);

    @Test
    void compatibleDatabaseIsOnlyRead() {
        when(jdbc.queryForList(anyString(), eq(String.class))).thenReturn(List.of());
        when(jdbc.queryForObject(anyString(), eq(Long.class))).thenReturn(0L);

        initializer.run(new DefaultApplicationArguments());

        verify(jdbc).queryForList(anyString(), eq(String.class));
        verify(jdbc).queryForObject(anyString(), eq(Long.class));
        verifyNoMoreInteractions(jdbc);
    }

    @Test
    void requiredSubmissionColumnIsReportedWithoutAlteringIt() {
        when(jdbc.queryForList(anyString(), eq(String.class))).thenReturn(List.of("NO"));

        assertThrows(IllegalStateException.class, () -> initializer.run(new DefaultApplicationArguments()));

        verify(jdbc).queryForList(anyString(), eq(String.class));
        verifyNoMoreInteractions(jdbc);
    }

    @Test
    void nullVersionsAreReportedWithoutUpdatingRecords() {
        when(jdbc.queryForList(anyString(), eq(String.class))).thenReturn(List.of());
        when(jdbc.queryForObject(anyString(), eq(Long.class))).thenReturn(1L);

        assertThrows(IllegalStateException.class, () -> initializer.run(new DefaultApplicationArguments()));

        verify(jdbc).queryForList(anyString(), eq(String.class));
        verify(jdbc).queryForObject(anyString(), eq(Long.class));
        verifyNoMoreInteractions(jdbc);
    }
}
