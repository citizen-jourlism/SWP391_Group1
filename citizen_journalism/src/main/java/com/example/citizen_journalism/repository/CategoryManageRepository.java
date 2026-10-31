package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.Category;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryManageRepository extends JpaRepository<Category, Long> {
    Optional<Category> findBySlugIgnoreCase(String slug);
}