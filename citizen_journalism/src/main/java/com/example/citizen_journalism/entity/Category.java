package com.example.citizen_journalism.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Table(name = "categories", indexes = {
    // 1. Tìm kiếm theo trạng thái hoạt động
    @Index(name = "idx_categories_is_active", columnList = "is_active"),

    // 2. Tìm kiếm theo Phó Tổng biên tập phụ trách (lọc theo deputy_eic_id)
    @Index(name = "idx_categories_deputy_eic", columnList = "deputy_eic_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Category extends BaseEntity {

    @NotBlank(message = "Category name is required")
    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @NotBlank(message = "Slug is required")
    @Column(name = "slug", nullable = false, unique = true, length = 100)
    private String slug;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deputy_eic_id")
    private User deputyEic;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

}
