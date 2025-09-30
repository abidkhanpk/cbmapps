-- Fix for logical replication on user_roles table to allow deletes
-- This sets replica identity to FULL so that delete operations are published with full row data
ALTER TABLE "user_roles" REPLICA IDENTITY FULL;