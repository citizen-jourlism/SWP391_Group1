package com.example.citizen_journalism.config;

import com.example.citizen_journalism.security.ActiveUserJwtConverter;
import com.example.citizen_journalism.security.RestAuthenticationHandler;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.ObjectMapper;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Exercises the actual filter order with isolated identities and no database access. */
class WorkflowSecurityTest {
    @Test
    void restoredAccountWorkflowsKeepEditorialBoardPermissions() throws Exception {
        try (var context = new AnnotationConfigWebApplicationContext()) {
            context.setServletContext(new MockServletContext());
            context.register(SecurityConfig.class, Fixtures.class);
            context.refresh();
            var mvc = MockMvcBuilders.standaloneSetup(new Endpoints())
                    .addFilters(context.getBean(FilterChainProxy.class)).build();

            mvc.perform(get("/api/leadership/queue").header("Authorization", "Bearer EIC"))
                    .andExpect(status().isOk());
            mvc.perform(get("/api/leadership/notes/submissions/TEST").header("Authorization", "Bearer EDITOR"))
                    .andExpect(status().isOk());
            for (String path : List.of("/api/leadership/appeals", "/api/leadership/violations")) {
                mvc.perform(get(path).header("Authorization", "Bearer DEPUTY_EIC")).andExpect(status().isOk());
                mvc.perform(get(path).header("Authorization", "Bearer EIC")).andExpect(status().isForbidden());
                mvc.perform(get(path).header("Authorization", "Bearer EDITOR")).andExpect(status().isForbidden());
                mvc.perform(get(path)).andExpect(status().isUnauthorized());
            }
            mvc.perform(get("/api/appeals").header("Authorization", "Bearer stale-token"))
                    .andExpect(status().isOk());
        }
    }

    @TestConfiguration
    static class Fixtures {
        @Bean RestAuthenticationHandler handler() { return new RestAuthenticationHandler(new ObjectMapper()); }
        @Bean JwtDecoder decoder() {
            return token -> Jwt.withTokenValue(token).header("alg", "none").subject(token).build();
        }
        @Bean ActiveUserJwtConverter converter() {
            var converter = mock(ActiveUserJwtConverter.class);
            when(converter.convert(any())).thenAnswer(invocation -> {
                Jwt jwt = invocation.getArgument(0);
                return new JwtAuthenticationToken(jwt,
                        List.of(new SimpleGrantedAuthority("ROLE_" + jwt.getSubject())));
            });
            return converter;
        }
    }

    @RestController
    static class Endpoints {
        @GetMapping({"/api/leadership/queue", "/api/leadership/notes/submissions/TEST",
                "/api/leadership/appeals", "/api/leadership/violations", "/api/appeals"})
        String ok() { return "ok"; }
    }
}
