package com.example.citizen_journalism.repository;

import com.example.citizen_journalism.entity.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {

    @Query("select count(s) from Submission s where s.author.id = :authorId")
    long countByAuthorId(@Param("authorId") String authorId);
}