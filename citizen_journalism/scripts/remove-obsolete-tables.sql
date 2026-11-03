-- Only after backup, migration, and application checks have completed successfully.
-- Guard against deleting uncopied records. Unknown source schemas fail without dropping tables.
DELIMITER //
DROP PROCEDURE IF EXISTS cj_remove_obsolete_tables//
CREATE PROCEDURE cj_remove_obsolete_tables()
BEGIN
  IF EXISTS(SELECT 1 FROM bonus_point_awards) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Bonus awards are not empty; reconcile them before removal.';
  END IF;
  IF EXISTS(SELECT 1 FROM user_violations v LEFT JOIN submissions s
      ON s.record_kind='ACCOUNT_VIOLATION' AND s.workflow_legacy_id=v.id
      WHERE s.id IS NULL OR NOT(s.content <=> v.description) OR NOT(s.author_id <=> v.user_id)
        OR NOT(s.assigned_editor_id <=> v.reported_by_id)
        OR NOT(s.duplicate_submission_id <=> COALESCE(v.related_submission_id,v.submission_id))
        OR NOT(s.workflow_violation_type <=> v.type) OR NOT(s.workflow_severity <=> v.severity)
        OR NOT(s.workflow_version <=> COALESCE(v.version,0))
        OR NOT(s.workflow_action <=> v.proposed_action) OR NOT(s.workflow_points_deducted <=> v.points_deducted)
        OR NOT(s.workflow_evidence_note <=> v.evidence_note) OR NOT(s.workflow_reviewed_by <=> v.reviewed_by)
        OR NOT(s.workflow_review_note <=> COALESCE(v.review_note,v.resolution_note))
        OR NOT(s.workflow_reviewed_at <=> v.reviewed_at) OR NOT(s.workflow_decided_by <=> v.approved_by)
        OR NOT(s.workflow_decision_note <=> v.approval_note) OR NOT(s.workflow_decided_at <=> v.approved_at)
        OR NOT(s.workflow_retraction_snapshot <=> v.retraction_snapshot)
        OR NOT(s.created_at <=> v.created_at) OR NOT(s.updated_at <=> v.updated_at)
        OR NOT(s.status <=> CASE v.status WHEN 'PENDING_REVIEW' THEN 'PENDING' WHEN 'PENDING_APPROVAL' THEN 'DEPUTY_PENDING'
          WHEN 'RESOLVED' THEN 'PUBLISHED' WHEN 'DISMISSED' THEN 'CANCELLED' WHEN 'REJECTED' THEN 'REJECTED' END)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Violation migration mismatch; original tables retained.';
  END IF;
  IF EXISTS(SELECT 1 FROM violation_appeals a LEFT JOIN submissions s
      ON s.record_kind='ACCOUNT_APPEAL' AND s.workflow_legacy_id=a.id
      WHERE s.id IS NULL OR NOT(s.content <=> a.reason) OR NOT(s.author_id <=> a.user_id)
        OR NOT(s.workflow_evidence_note <=> a.evidence_note) OR NOT(s.workflow_reviewed_by <=> a.reviewed_by)
        OR NOT(s.workflow_review_note <=> a.review_note) OR NOT(s.workflow_reviewed_at <=> a.reviewed_at)
        OR NOT(s.workflow_decided_by <=> a.decided_by) OR NOT(s.workflow_decision_note <=> a.decision_note)
        OR NOT(s.workflow_decided_at <=> a.decided_at) OR NOT(s.created_at <=> a.created_at)
        OR NOT(s.updated_at <=> a.updated_at)
        OR NOT(s.status <=> CASE a.status WHEN 'PENDING_EDITOR' THEN 'PENDING' WHEN 'PENDING_FINAL' THEN 'DEPUTY_PENDING'
          WHEN 'APPROVED' THEN 'PUBLISHED' WHEN 'REJECTED' THEN 'REJECTED' END)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Appeal migration mismatch; original tables retained.';
  END IF;
  IF EXISTS(SELECT 1 FROM expert_applications a LEFT JOIN contributor_applications c
      ON c.application_kind='EXPERT' AND c.workflow_legacy_id=a.id
      WHERE c.id IS NULL OR NOT(c.applicant_id <=> a.applicant_id) OR NOT(c.expertise_fields <=> a.field)
        OR NOT(c.experience <=> a.qualifications) OR NOT(c.documents <=> JSON_QUOTE(a.evidence))
        OR NOT(c.editor_id <=> a.reviewer_id) OR NOT(c.editor_note <=> a.note)
        OR NOT(c.editor_reviewed_at <=> a.reviewed_at) OR NOT(c.created_at <=> a.created_at)
        OR NOT(c.updated_at <=> a.updated_at)
        OR NOT(c.status <=> CASE a.status WHEN 'PENDING' THEN 'PENDING_EDITOR' ELSE a.status END)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Expert migration mismatch; original tables retained.';
  END IF;
  DROP TABLE bonus_point_awards,expert_applications,user_violations,violation_appeals;
END//
CALL cj_remove_obsolete_tables()//
DROP PROCEDURE cj_remove_obsolete_tables//
DELIMITER ;
