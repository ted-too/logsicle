-- Modify "organizations" table
ALTER TABLE "organizations" ADD COLUMN "slug" text NOT NULL, ADD CONSTRAINT "uni_organizations_slug" UNIQUE ("slug");
-- Modify "projects" table
ALTER TABLE "projects" ADD COLUMN "slug" text NOT NULL, ADD CONSTRAINT "uni_projects_slug" UNIQUE ("slug");
