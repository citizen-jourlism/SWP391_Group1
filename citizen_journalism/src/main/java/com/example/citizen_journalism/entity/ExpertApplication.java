package com.example.citizen_journalism.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name="contributor_applications")
@org.hibernate.annotations.SQLRestriction("application_kind = 'EXPERT'")
@Getter @Setter @NoArgsConstructor
public class ExpertApplication extends BaseEntity {
    @Column(name="application_kind", length=30)
    private String applicationKind = "EXPERT";
    @Column(name="workflow_legacy_id")
    private Long legacyId;
    @Column(nullable=false, length=50)
    private String province = "";
    @Column(nullable=false, length=100)
    private String occupation = "";
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=20)
    private ContributorApplication.Availability availability = ContributorApplication.Availability.PART_TIME;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="applicant_id", nullable=false)
    private User applicant;
    @Column(name="expertise_fields", nullable=false, length=255)
    private String field;
    @Column(name="experience", nullable=false, columnDefinition="TEXT")
    private String qualifications;
    @Convert(converter=EvidenceJsonConverter.class)
    @Column(name="documents", columnDefinition="JSON")
    private String evidence;
    @Convert(converter=PendingStatusConverter.class)
    @Column(nullable=false, length=30)
    private String status;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="editor_id")
    private User reviewer;
    @Column(name="editor_reviewed_at")
    private LocalDateTime reviewedAt;
    @Column(name="editor_note", columnDefinition="TEXT")
    private String note;
    @Override public Long getId() { return legacyId == null ? super.getId() : legacyId; }

    @Converter
    public static class PendingStatusConverter implements AttributeConverter<String, String> {
        public String convertToDatabaseColumn(String value) { return "PENDING".equals(value) ? "PENDING_EDITOR" : value; }
        public String convertToEntityAttribute(String value) { return "PENDING_EDITOR".equals(value) ? "PENDING" : value; }
    }
    @Converter
    public static class EvidenceJsonConverter implements AttributeConverter<String, String> {
        private static final tools.jackson.databind.json.JsonMapper JSON = new tools.jackson.databind.json.JsonMapper();
        public String convertToDatabaseColumn(String value) { return value == null ? null : JSON.writeValueAsString(value); }
        public String convertToEntityAttribute(String value) { return value == null ? null : JSON.readValue(value, String.class); }
    }
}
