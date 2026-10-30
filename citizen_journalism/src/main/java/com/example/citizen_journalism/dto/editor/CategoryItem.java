package com.example.citizen_journalism.dto.editor;

public record CategoryItem(
        Long id,
        String name,
        String slug,
        String deputyEicId,
        boolean active
) {}