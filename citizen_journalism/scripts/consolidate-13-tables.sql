-- Run with the application stopped, after taking a complete mysqldump backup.
-- This step copies records; obsolete tables are removed by the separate cleanup script.
DELIMITER //
DROP PROCEDURE IF EXISTS cj_add_workflow_column//
CREATE PROCEDURE cj_add_workflow_column(IN tbl VARCHAR(64), IN col VARCHAR(64), IN definition TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema=DATABASE() AND table_name=tbl AND column_name=col) THEN
    SET @ddl=CONCAT('ALTER TABLE `',tbl,'` ADD COLUMN `',col,'` ',definition);
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END//
CALL cj_add_workflow_column('submissions','record_kind',"VARCHAR(30) NOT NULL DEFAULT 'CONTENT'")//
CALL cj_add_workflow_column('submissions','workflow_legacy_id','BIGINT NULL')//
CALL cj_add_workflow_column('submissions','workflow_version','BIGINT NOT NULL DEFAULT 0')//
CALL cj_add_workflow_column('submissions','workflow_violation_type','VARCHAR(40) NULL')//
CALL cj_add_workflow_column('submissions','workflow_severity','VARCHAR(20) NULL')//
CALL cj_add_workflow_column('submissions','workflow_action','VARCHAR(30) NULL')//
CALL cj_add_workflow_column('submissions','workflow_points_deducted','INT NULL')//
CALL cj_add_workflow_column('submissions','workflow_evidence_note','TEXT NULL')//
CALL cj_add_workflow_column('submissions','workflow_reviewed_by','VARCHAR(10) NULL')//
CALL cj_add_workflow_column('submissions','workflow_review_note','TEXT NULL')//
CALL cj_add_workflow_column('submissions','workflow_reviewed_at','DATETIME(6) NULL')//
CALL cj_add_workflow_column('submissions','workflow_decided_by','VARCHAR(10) NULL')//
CALL cj_add_workflow_column('submissions','workflow_decision_note','TEXT NULL')//
CALL cj_add_workflow_column('submissions','workflow_decided_at','DATETIME(6) NULL')//
CALL cj_add_workflow_column('submissions','workflow_retraction_snapshot','LONGTEXT NULL')//
CALL cj_add_workflow_column('contributor_applications','application_kind',"VARCHAR(30) NOT NULL DEFAULT 'CONTRIBUTOR'")//
CALL cj_add_workflow_column('contributor_applications','workflow_legacy_id','BIGINT NULL')//
DROP PROCEDURE cj_add_workflow_column//

DROP PROCEDURE IF EXISTS cj_copy_account_workflows//
CREATE PROCEDURE cj_copy_account_workflows()
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE()
      AND table_name='submissions' AND index_name='uk_submissions_workflow_legacy') THEN
    ALTER TABLE submissions ADD UNIQUE KEY uk_submissions_workflow_legacy(record_kind,workflow_legacy_id);
    ALTER TABLE submissions ADD INDEX idx_submissions_kind_status(record_kind,status,created_at);
    ALTER TABLE submissions ADD CONSTRAINT fk_workflow_reviewer FOREIGN KEY(workflow_reviewed_by) REFERENCES users(id);
    ALTER TABLE submissions ADD CONSTRAINT fk_workflow_decider FOREIGN KEY(workflow_decided_by) REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE()
      AND table_name='contributor_applications' AND index_name='uk_applications_workflow_legacy') THEN
    ALTER TABLE contributor_applications ADD UNIQUE KEY uk_applications_workflow_legacy(application_kind,workflow_legacy_id);
    ALTER TABLE contributor_applications ADD INDEX idx_applications_kind_status(application_kind,status,created_at);
  END IF;
  START TRANSACTION;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='user_violations') THEN
    INSERT INTO submissions(record_kind,workflow_legacy_id,created_at,updated_at,type,title,content,is_anonymous,
      pin_failed_attempts,author_id,assigned_editor_id,duplicate_submission_id,status,workflow_version,
      workflow_violation_type,workflow_severity,workflow_action,workflow_points_deducted,workflow_evidence_note,
      workflow_reviewed_by,workflow_review_note,workflow_reviewed_at,workflow_decided_by,workflow_decision_note,
      workflow_decided_at,workflow_retraction_snapshot)
    SELECT 'ACCOUNT_VIOLATION',v.id,v.created_at,v.updated_at,'COMPLAINT','Account violation report',v.description,0,
      0,v.user_id,v.reported_by_id,COALESCE(v.related_submission_id,v.submission_id),
      CASE v.status WHEN 'PENDING_REVIEW' THEN 'PENDING' WHEN 'PENDING_APPROVAL' THEN 'DEPUTY_PENDING'
        WHEN 'RESOLVED' THEN 'PUBLISHED' WHEN 'DISMISSED' THEN 'CANCELLED' WHEN 'REJECTED' THEN 'REJECTED'
        ELSE NULL END,
      COALESCE(v.version,0),v.type,v.severity,v.proposed_action,v.points_deducted,v.evidence_note,
      v.reviewed_by,COALESCE(v.review_note,v.resolution_note),v.reviewed_at,v.approved_by,v.approval_note,
      v.approved_at,v.retraction_snapshot
    FROM user_violations v WHERE NOT EXISTS (SELECT 1 FROM submissions s
      WHERE s.record_kind='ACCOUNT_VIOLATION' AND s.workflow_legacy_id=v.id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='violation_appeals') THEN
    INSERT INTO submissions(record_kind,workflow_legacy_id,created_at,updated_at,type,title,content,is_anonymous,
      pin_failed_attempts,author_id,status,workflow_evidence_note,workflow_reviewed_by,workflow_review_note,
      workflow_reviewed_at,workflow_decided_by,workflow_decision_note,workflow_decided_at)
    SELECT 'ACCOUNT_APPEAL',a.id,a.created_at,a.updated_at,'COMPLAINT','Account unlock appeal',a.reason,0,0,a.user_id,
      CASE a.status WHEN 'PENDING_EDITOR' THEN 'PENDING' WHEN 'PENDING_FINAL' THEN 'DEPUTY_PENDING'
        WHEN 'APPROVED' THEN 'PUBLISHED' WHEN 'REJECTED' THEN 'REJECTED' ELSE NULL END,
      a.evidence_note,a.reviewed_by,a.review_note,a.reviewed_at,a.decided_by,a.decision_note,a.decided_at
    FROM violation_appeals a WHERE NOT EXISTS (SELECT 1 FROM submissions s
      WHERE s.record_kind='ACCOUNT_APPEAL' AND s.workflow_legacy_id=a.id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='expert_applications') THEN
    INSERT INTO contributor_applications(application_kind,workflow_legacy_id,created_at,updated_at,availability,
      documents,editor_note,editor_reviewed_at,experience,expertise_fields,occupation,province,status,applicant_id,editor_id)
    SELECT 'EXPERT',a.id,a.created_at,a.updated_at,'PART_TIME',JSON_QUOTE(a.evidence),a.note,a.reviewed_at,
      a.qualifications,a.field,'','',CASE a.status WHEN 'PENDING' THEN 'PENDING_EDITOR' ELSE a.status END,a.applicant_id,a.reviewer_id
    FROM expert_applications a WHERE NOT EXISTS (SELECT 1 FROM contributor_applications c
      WHERE c.application_kind='EXPERT' AND c.workflow_legacy_id=a.id);
  END IF;
  COMMIT;
  -- Future generated IDs must not overlap the public IDs retained from legacy tables.
  SELECT GREATEST(COALESCE(MAX(id),0),COALESCE(MAX(workflow_legacy_id),0))+1 INTO @next_id FROM submissions;
  SET @ddl=CONCAT('ALTER TABLE submissions AUTO_INCREMENT=',@next_id);
  PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  SELECT GREATEST(COALESCE(MAX(id),0),COALESCE(MAX(workflow_legacy_id),0))+1 INTO @next_id FROM contributor_applications;
  SET @ddl=CONCAT('ALTER TABLE contributor_applications AUTO_INCREMENT=',@next_id);
  PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
END//
CALL cj_copy_account_workflows()//
DROP PROCEDURE cj_copy_account_workflows//
DELIMITER ;

SELECT record_kind,COUNT(*) AS records FROM submissions GROUP BY record_kind;
SELECT application_kind,COUNT(*) AS records FROM contributor_applications GROUP BY application_kind;
