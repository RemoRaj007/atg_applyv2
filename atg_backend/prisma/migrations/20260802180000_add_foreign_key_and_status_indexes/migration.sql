-- Postgres does not create indexes for foreign keys (unlike MySQL), and Prisma
-- only emits them for @@index/@@unique. Before this migration the schema had
-- four indexes across 37 models, so every "my applications", "my notifications"
-- and profile-child lookup was a sequential scan, as was the d_status = 'active'
-- filter that nearly every query carries.
--
-- Columns already covered by the leading edge of a composite @@unique are
-- deliberately not indexed again.
--
-- These are plain CREATE INDEX, not CONCURRENTLY: prisma migrate deploy runs a
-- migration in one transaction, which CONCURRENTLY cannot join. Each table is
-- small enough today that the write lock is brief; revisit if that changes.

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "User_role_d_status_idx" ON "User"("role", "d_status");

-- CreateIndex
CREATE INDEX "User_d_status_idx" ON "User"("d_status");

-- CreateIndex
CREATE INDEX "Company_d_status_idx" ON "Company"("d_status");

-- CreateIndex
CREATE INDEX "Job_companyId_idx" ON "Job"("companyId");

-- CreateIndex
CREATE INDEX "Job_jobRoleId_idx" ON "Job"("jobRoleId");

-- CreateIndex
CREATE INDEX "Job_d_status_createdAt_idx" ON "Job"("d_status", "createdAt");

-- CreateIndex
CREATE INDEX "JobRole_d_status_idx" ON "JobRole"("d_status");

-- CreateIndex
CREATE INDEX "JobRole_status_idx" ON "JobRole"("status");

-- CreateIndex
CREATE INDEX "CandidateApplication_userId_d_status_idx" ON "CandidateApplication"("userId", "d_status");

-- CreateIndex
CREATE INDEX "CandidateApplication_jobId_idx" ON "CandidateApplication"("jobId");

-- CreateIndex
CREATE INDEX "CandidateApplication_scholarshipId_idx" ON "CandidateApplication"("scholarshipId");

-- CreateIndex
CREATE INDEX "CandidateApplication_staffId_idx" ON "CandidateApplication"("staffId");

-- CreateIndex
CREATE INDEX "CandidateApplication_status_idx" ON "CandidateApplication"("status");

-- CreateIndex
CREATE INDEX "Payment_userId_d_status_idx" ON "Payment"("userId", "d_status");

-- CreateIndex
CREATE INDEX "Payment_jobId_idx" ON "Payment"("jobId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Notification_userId_unread_idx" ON "Notification"("userId", "unread");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Scholarship_d_status_idx" ON "Scholarship"("d_status");

-- CreateIndex
CREATE INDEX "LogEntry_userId_idx" ON "LogEntry"("userId");

-- CreateIndex
CREATE INDEX "ChangeRequest_createdById_idx" ON "ChangeRequest"("createdById");

-- CreateIndex
CREATE INDEX "ChangeRequest_targetId_idx" ON "ChangeRequest"("targetId");

-- CreateIndex
CREATE INDEX "ChangeRequest_status_idx" ON "ChangeRequest"("status");

-- CreateIndex
CREATE INDEX "ProfileValue_columnId_idx" ON "ProfileValue"("columnId");

-- CreateIndex
CREATE INDEX "JobFormColumn_jobId_idx" ON "JobFormColumn"("jobId");

-- CreateIndex
CREATE INDEX "JobFormValue_columnId_idx" ON "JobFormValue"("columnId");

-- CreateIndex
CREATE INDEX "UserSkill_skillId_idx" ON "UserSkill"("skillId");

-- CreateIndex
CREATE INDEX "JobSkill_skillId_idx" ON "JobSkill"("skillId");

-- CreateIndex
CREATE INDEX "JobRoleSkill_skillId_idx" ON "JobRoleSkill"("skillId");

-- CreateIndex
CREATE INDEX "UserJobRole_jobRoleId_idx" ON "UserJobRole"("jobRoleId");

-- CreateIndex
CREATE INDEX "ApplicationComment_applicationId_idx" ON "ApplicationComment"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationComment_senderId_idx" ON "ApplicationComment"("senderId");

-- CreateIndex
CREATE INDEX "UserPhone_userId_idx" ON "UserPhone"("userId");

-- CreateIndex
CREATE INDEX "UserAddress_userId_idx" ON "UserAddress"("userId");

-- CreateIndex
CREATE INDEX "UserAcademicQualification_userId_idx" ON "UserAcademicQualification"("userId");

-- CreateIndex
CREATE INDEX "UserLanguage_userId_idx" ON "UserLanguage"("userId");

-- CreateIndex
CREATE INDEX "UserItSkill_userId_idx" ON "UserItSkill"("userId");

-- CreateIndex
CREATE INDEX "UserDocument_userId_idx" ON "UserDocument"("userId");

-- CreateIndex
CREATE INDEX "UserOtherQualification_userId_idx" ON "UserOtherQualification"("userId");

-- CreateIndex
CREATE INDEX "UserExperience_userId_idx" ON "UserExperience"("userId");

-- CreateIndex
CREATE INDEX "UserReference_userId_idx" ON "UserReference"("userId");

-- CreateIndex
CREATE INDEX "AIOperator_profileId_idx" ON "AIOperator"("profileId");

-- CreateIndex
CREATE INDEX "AnonymousJobMatch_profileId_idx" ON "AnonymousJobMatch"("profileId");

-- CreateIndex
CREATE INDEX "AnonymousJobMatch_profileId_createdAt_idx" ON "AnonymousJobMatch"("profileId", "createdAt");

