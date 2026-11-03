package com.example.citizen_journalism;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
        "spring.datasource.hikari.read-only=true",
        "spring.datasource.hikari.connection-init-sql=SET SESSION TRANSACTION READ ONLY",
        "app.mail.enabled=false"
})
class CitizenJournalismApplicationTests {

    @org.springframework.beans.factory.annotation.Autowired
    private jakarta.persistence.EntityManager entityManager;

    @org.springframework.beans.factory.annotation.Autowired
    private org.springframework.context.ApplicationContext context;

    @Test
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    void existingDatabaseCanReadEveryMappedEntityWithoutSchemaUpdates() {
        for (var entity : entityManager.getMetamodel().getEntities()) {
            entityManager.createQuery("select e from " + entity.getName() + " e")
                    .setMaxResults(5).getResultList();
        }
    }

    @Test
    void startupDataInitializersAreDisabled() {
        org.junit.jupiter.api.Assertions.assertTrue(context.getBeansOfType(
                com.example.citizen_journalism.config.AdminAccountInitializer.class).isEmpty());
        org.junit.jupiter.api.Assertions.assertTrue(context.getBeansOfType(
                com.example.citizen_journalism.config.ReputationScoreInitializer.class).isEmpty());
    }

	@Test
	void contextLoads() {
	}

}
