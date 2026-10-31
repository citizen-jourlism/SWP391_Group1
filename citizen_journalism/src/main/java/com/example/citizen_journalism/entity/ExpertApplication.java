package com.example.citizen_journalism.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name="expert_applications")
@Getter @Setter @NoArgsConstructor
public class ExpertApplication extends BaseEntity {
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(nullable=false)
    private User applicant;
    @Column(nullable=false, length=100)
    private String field;
    @Column(nullable=false, length=3000)
    private String qualifications;
    @Column(length=2000)
    private String evidence;
    @Column(nullable=false, length=30)
    private String status;
    @ManyToOne(fetch=FetchType.LAZY)
    private User reviewer;
    private LocalDateTime reviewedAt;
    @Column(length=2000)
    private String note;
}
