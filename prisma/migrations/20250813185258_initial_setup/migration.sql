-- CreateEnum
CREATE TYPE "CriticalityEnum" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "ComponentTypeEnum" AS ENUM ('mechanical', 'electrical', 'instrumentation', 'rotating', 'static', 'other');

-- CreateEnum
CREATE TYPE "FmecaStudyStatusEnum" AS ENUM ('draft', 'in_review', 'approved', 'archived');

-- CreateEnum
CREATE TYPE "FmecaApprovalStatusEnum" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "CmTechniqueEnum" AS ENUM ('vibration', 'thermography', 'ultrasound', 'oil', 'visual', 'motor_current', 'acoustic', 'other');

-- CreateEnum
CREATE TYPE "CmReadingStatusEnum" AS ENUM ('ok', 'warning', 'alarm');

-- CreateEnum
CREATE TYPE "ActionEntityTypeEnum" AS ENUM ('fmeca_item', 'cm_reading', 'component');

-- CreateEnum
CREATE TYPE "ActionPriorityEnum" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "ActionStatusEnum" AS ENUM ('open', 'in_progress', 'blocked', 'done', 'cancelled');

-- CreateEnum
CREATE TYPE "AttachmentEntityTypeEnum" AS ENUM ('fmeca_item', 'cm_reading', 'action', 'asset', 'component');

-- CreateEnum
CREATE TYPE "AuditLogEntityTypeEnum" AS ENUM ('user', 'role', 'company', 'site', 'area', 'system', 'asset', 'component', 'fmeca_study', 'fmeca_item', 'cm_task', 'cm_reading', 'action', 'attachment', 'fmeca_category', 'failure_mode', 'rating_scale', 'criticality_rule');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "systems" (
    "id" TEXT NOT NULL,
    "area_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "system_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag_code" TEXT NOT NULL,
    "criticality" "CriticalityEnum" NOT NULL DEFAULT 'low',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "components" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "component_code" TEXT NOT NULL,
    "type" "ComponentTypeEnum" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fmeca_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "fmeca_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "failure_modes" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "typical_causes" TEXT,
    "typical_effects" TEXT,
    "detection_methods" TEXT,

    CONSTRAINT "failure_modes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rating_scales" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "min_value" INTEGER NOT NULL,
    "max_value" INTEGER NOT NULL,
    "description" TEXT,

    CONSTRAINT "rating_scales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rating_scale_values" (
    "id" TEXT NOT NULL,
    "scale_id" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "rating_scale_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "criticality_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rpn_thresholds" JSONB NOT NULL,
    "color_map" JSONB NOT NULL,

    CONSTRAINT "criticality_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fmeca_studies" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scope" TEXT,
    "status" "FmecaStudyStatusEnum" NOT NULL DEFAULT 'draft',
    "owner_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fmeca_studies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fmeca_items" (
    "id" TEXT NOT NULL,
    "study_id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "function" TEXT NOT NULL,
    "failure_mode_id" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "cause" TEXT NOT NULL,
    "detection" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "occurrence" INTEGER NOT NULL,
    "detectability" INTEGER NOT NULL,
    "rpn" INTEGER NOT NULL DEFAULT 0,
    "criticality" "CriticalityEnum" NOT NULL DEFAULT 'low',
    "recommended_actions" TEXT,
    "monitoring_techniques" TEXT[],

    CONSTRAINT "fmeca_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fmeca_approvals" (
    "id" TEXT NOT NULL,
    "study_id" TEXT NOT NULL,
    "approver_user_id" TEXT NOT NULL,
    "status" "FmecaApprovalStatusEnum" NOT NULL,
    "comment" TEXT,
    "decided_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fmeca_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cm_tasks" (
    "id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "technique" "CmTechniqueEnum" NOT NULL,
    "interval_days" INTEGER NOT NULL,
    "procedure" TEXT NOT NULL,
    "acceptance_criteria" TEXT NOT NULL,
    "last_performed_at" TIMESTAMP(3),
    "next_due_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cm_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cm_readings" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL,
    "result" JSONB NOT NULL,
    "status" "CmReadingStatusEnum" NOT NULL,
    "notes" TEXT,
    "performed_by_user_id" TEXT NOT NULL,

    CONSTRAINT "cm_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "entity_type" "AttachmentEntityTypeEnum" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by_user_id" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "asset_id" TEXT,
    "component_id" TEXT,
    "fmeca_item_id" TEXT,
    "cm_reading_id" TEXT,
    "action_id" TEXT,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "entity_type" "ActionEntityTypeEnum" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "assignee_user_id" TEXT NOT NULL,
    "due_date" DATE NOT NULL,
    "priority" "ActionPriorityEnum" NOT NULL,
    "status" "ActionStatusEnum" NOT NULL DEFAULT 'open',
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "component_id" TEXT,
    "fmeca_item_id" TEXT,
    "cm_reading_id" TEXT,

    CONSTRAINT "actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_comments" (
    "id" TEXT NOT NULL,
    "action_id" TEXT NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" "AuditLogEntityTypeEnum" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "sid" TEXT NOT NULL,
    "sess" JSONB NOT NULL,
    "expire" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "companies_code_key" ON "companies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sites_company_id_code_key" ON "sites"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "areas_site_id_code_key" ON "areas"("site_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "systems_area_id_code_key" ON "systems"("area_id", "code");

-- CreateIndex
CREATE INDEX "assets_name_tag_code_idx" ON "assets"("name", "tag_code");

-- CreateIndex
CREATE UNIQUE INDEX "assets_system_id_tag_code_key" ON "assets"("system_id", "tag_code");

-- CreateIndex
CREATE INDEX "components_name_component_code_idx" ON "components"("name", "component_code");

-- CreateIndex
CREATE UNIQUE INDEX "components_asset_id_component_code_key" ON "components"("asset_id", "component_code");

-- CreateIndex
CREATE UNIQUE INDEX "fmeca_categories_name_key" ON "fmeca_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "failure_modes_category_id_code_key" ON "failure_modes"("category_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "rating_scales_name_key" ON "rating_scales"("name");

-- CreateIndex
CREATE UNIQUE INDEX "rating_scale_values_scale_id_value_key" ON "rating_scale_values"("scale_id", "value");

-- CreateIndex
CREATE UNIQUE INDEX "criticality_rules_name_key" ON "criticality_rules"("name");

-- CreateIndex
CREATE INDEX "actions_status_idx" ON "actions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "session_sid_key" ON "session"("sid");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "systems" ADD CONSTRAINT "systems_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "components" ADD CONSTRAINT "components_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "failure_modes" ADD CONSTRAINT "failure_modes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "fmeca_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rating_scale_values" ADD CONSTRAINT "rating_scale_values_scale_id_fkey" FOREIGN KEY ("scale_id") REFERENCES "rating_scales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fmeca_studies" ADD CONSTRAINT "fmeca_studies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fmeca_studies" ADD CONSTRAINT "fmeca_studies_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fmeca_items" ADD CONSTRAINT "fmeca_items_study_id_fkey" FOREIGN KEY ("study_id") REFERENCES "fmeca_studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fmeca_items" ADD CONSTRAINT "fmeca_items_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fmeca_items" ADD CONSTRAINT "fmeca_items_failure_mode_id_fkey" FOREIGN KEY ("failure_mode_id") REFERENCES "failure_modes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fmeca_approvals" ADD CONSTRAINT "fmeca_approvals_study_id_fkey" FOREIGN KEY ("study_id") REFERENCES "fmeca_studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fmeca_approvals" ADD CONSTRAINT "fmeca_approvals_approver_user_id_fkey" FOREIGN KEY ("approver_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cm_tasks" ADD CONSTRAINT "cm_tasks_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cm_readings" ADD CONSTRAINT "cm_readings_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "cm_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cm_readings" ADD CONSTRAINT "cm_readings_performed_by_user_id_fkey" FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_fmeca_item_id_fkey" FOREIGN KEY ("fmeca_item_id") REFERENCES "fmeca_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_cm_reading_id_fkey" FOREIGN KEY ("cm_reading_id") REFERENCES "cm_readings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "actions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_assignee_user_id_fkey" FOREIGN KEY ("assignee_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_fmeca_item_id_fkey" FOREIGN KEY ("fmeca_item_id") REFERENCES "fmeca_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_cm_reading_id_fkey" FOREIGN KEY ("cm_reading_id") REFERENCES "cm_readings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_comments" ADD CONSTRAINT "action_comments_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_comments" ADD CONSTRAINT "action_comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
