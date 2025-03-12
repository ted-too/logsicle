-- Create "organizations" table
CREATE TABLE "organizations" (
  "id" text NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "name" text NOT NULL,
  "description" text NULL,
  "created_by" text NOT NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_organizations_created_by" to table: "organizations"
CREATE INDEX "idx_organizations_created_by" ON "organizations" ("created_by");
-- Create index "idx_organizations_deleted_at" to table: "organizations"
CREATE INDEX "idx_organizations_deleted_at" ON "organizations" ("deleted_at");
-- Modify "projects" table
ALTER TABLE "projects" ADD COLUMN "organization_id" text NOT NULL, ADD
 CONSTRAINT "fk_organizations_projects" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION;
-- Create index "idx_projects_organization_id" to table: "projects"
CREATE INDEX "idx_projects_organization_id" ON "projects" ("organization_id");
-- Modify "users" table
ALTER TABLE "users" ADD COLUMN "avatar_url" text NULL;
-- Create "team_memberships" table
CREATE TABLE "team_memberships" (
  "id" text NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "organization_id" text NOT NULL,
  "user_id" text NOT NULL,
  "role" text NOT NULL DEFAULT 'member',
  "joined_at" timestamptz NOT NULL,
  "invited_by" text NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_organizations_members" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT "fk_team_memberships_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_team_memberships_deleted_at" to table: "team_memberships"
CREATE INDEX "idx_team_memberships_deleted_at" ON "team_memberships" ("deleted_at");
-- Create index "idx_team_memberships_organization_id" to table: "team_memberships"
CREATE INDEX "idx_team_memberships_organization_id" ON "team_memberships" ("organization_id");
-- Create index "idx_team_memberships_user_id" to table: "team_memberships"
CREATE INDEX "idx_team_memberships_user_id" ON "team_memberships" ("user_id");
