-- CreateEnum
CREATE TYPE "Criticality" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "ComponentType" AS ENUM ('mechanical', 'electrical', 'instrumentation', 'rotating', 'static', 'other');

-- CreateEnum
CREATE TYPE "RatingDimension" AS ENUM ('severity', 'occurrence', 'detectability');

-- CreateEnum
CREATE TYPE "StudyStatus" AS ENUM ('draft', 'in_review', 'approved', 'archived');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "CmTechnique" AS ENUM ('vibration', 'thermography', 'ultrasound', 'oil', 'visual', 'motor_current', 'acoustic', 'other');

-- CreateEnum
CREATE TYPE "ReadingStatus" AS ENUM ('ok', 'warning', 'alarm');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('fmeca_item', 'cm_reading', 'action', 'asset', 'component');

-- CreateEnum
CREATE TYPE "ActionEntityType" AS ENUM ('fmeca_item', 'cm_reading', 'component');

-- CreateEnum
CREATE TYPE "ActionPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('open', 'in_progress', 'blocked', 'done', 'cancelled');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "full_name" TEXT NOT NULL,
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
    "role_id" TEXT NOT NULL
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
    "criticality" "Criticality" NOT NULL DEFAULT 'low',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "components" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "component_code" TEXT NOT NULL,
    "type" "ComponentType" NOT NULL DEFAULT 'other',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fmeca_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "fmeca_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "failure_modes" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "typical_causes" TEXT,
    "typical_effects" TEXT,
    "detection_methods" TEXT,

    CONSTRAINT "failure_modes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rating_scales" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dimension" "RatingDimension" NOT NULL,
    "min_value" INTEGER NOT NULL,
    "max_value" INTEGER NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "rating_scales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rating_scale_values" (
    "id" TEXT NOT NULL,
    "scale_id" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "rating_scale_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "criticality_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
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
    "status" "StudyStatus" NOT NULL DEFAULT 'draft',
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
    "rpn" INTEGER NOT NULL,
    "criticality" "Criticality" NOT NULL DEFAULT 'low',
    "recommended_actions" TEXT,
    "monitoring_techniques" JSONB,

    CONSTRAINT "fmeca_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fmeca_approvals" (
    "id" TEXT NOT NULL,
    "study_id" TEXT NOT NULL,
    "approver_user_id" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "comment" TEXT,
    "decided_at" TIMESTAMP(3),

    CONSTRAINT "fmeca_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cm_tasks" (
    "id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "technique" "CmTechnique" NOT NULL,
    "interval_days" INTEGER NOT NULL,
    "procedure" TEXT NOT NULL,
    "acceptance_criteria" TEXT NOT NULL,
    "last_performed_at" TIMESTAMP(3),
    "next_due_at" TIMESTAMP(3),

    CONSTRAINT "cm_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cm_readings" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" JSONB NOT NULL,
    "status" "ReadingStatus" NOT NULL DEFAULT 'ok',
    "notes" TEXT,
    "performed_by_user_id" TEXT NOT NULL,

    CONSTRAINT "cm_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "entity_type" "EntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by_user_id" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "entity_type" "ActionEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "assignee_user_id" TEXT NOT NULL,
    "due_date" TIMESTAMP(3),
    "priority" "ActionPriority" NOT NULL DEFAULT 'medium',
    "status" "ActionStatus" NOT NULL DEFAULT 'open',
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

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

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");

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
CREATE UNIQUE INDEX "assets_system_id_tag_code_key" ON "assets"("system_id", "tag_code");

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

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "fmeca_items" ADD CONSTRAINT "fmeca_items_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_assignee_user_id_fkey" FOREIGN KEY ("assignee_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_comments" ADD CONSTRAINT "action_comments_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_comments" ADD CONSTRAINT "action_comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
