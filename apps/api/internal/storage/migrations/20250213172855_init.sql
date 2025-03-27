-- Create "users" table
CREATE TABLE "users" (
  "id" text NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "email_verified" boolean NULL DEFAULT false,
  "image" text NULL,
  "has_onboarded" boolean NULL DEFAULT false,
  "last_login_at" timestamptz NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_users_deleted_at" to table: "users"
CREATE INDEX "idx_users_deleted_at" ON "users" ("deleted_at");
-- Create index "idx_users_email" to table: "users"
CREATE UNIQUE INDEX "idx_users_email" ON "users" ("email");
-- Create "verifications" table
CREATE TABLE "verifications" (
  "id" text NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_verifications_deleted_at" to table: "verifications"
CREATE INDEX "idx_verifications_deleted_at" ON "verifications" ("deleted_at");
-- Create "accounts" table
CREATE TABLE "accounts" (
  "id" text NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL,
  "access_token" text NULL,
  "refresh_token" text NULL,
  "id_token" text NULL,
  "access_token_expires_at" timestamptz NULL,
  "refresh_token_expires_at" timestamptz NULL,
  "scope" text NULL,
  "password" text NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_accounts_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_accounts_deleted_at" to table: "accounts"
CREATE INDEX "idx_accounts_deleted_at" ON "accounts" ("deleted_at");
-- Create index "idx_accounts_user_id" to table: "accounts"
CREATE INDEX "idx_accounts_user_id" ON "accounts" ("user_id");
-- Create "organizations" table
CREATE TABLE "organizations" (
  "id" text NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text NULL,
  "created_by_id" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "uni_organizations_slug" UNIQUE ("slug"),
  CONSTRAINT "fk_organizations_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_organizations_created_by_id" to table: "organizations"
CREATE INDEX "idx_organizations_created_by_id" ON "organizations" ("created_by_id");
-- Create index "idx_organizations_deleted_at" to table: "organizations"
CREATE INDEX "idx_organizations_deleted_at" ON "organizations" ("deleted_at");
-- Create "projects" table
CREATE TABLE "projects" (
  "id" text NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "created_by_id" text NOT NULL,
  "organization_id" text NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "allowed_origins" text[] NULL,
  "log_retention_days" bigint NULL DEFAULT 30,
  PRIMARY KEY ("id"),
  CONSTRAINT "uni_projects_slug" UNIQUE ("slug"),
  CONSTRAINT "fk_organizations_projects" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT "fk_projects_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_projects_created_by_id" to table: "projects"
CREATE INDEX "idx_projects_created_by_id" ON "projects" ("created_by_id");
-- Create index "idx_projects_deleted_at" to table: "projects"
CREATE INDEX "idx_projects_deleted_at" ON "projects" ("deleted_at");
-- Create index "idx_projects_organization_id" to table: "projects"
CREATE INDEX "idx_projects_organization_id" ON "projects" ("organization_id");
-- Create "api_keys" table
CREATE TABLE "api_keys" (
  "id" text NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "name" text NOT NULL,
  "key" text NOT NULL,
  "masked_key" text NOT NULL,
  "project_id" text NOT NULL,
  "user_id" text NOT NULL,
  "expires_at" text NULL,
  "last_used_at" text NULL,
  "permissions" text NULL,
  "metadata" text NULL,
  "scopes" text[] NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_api_keys_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT "fk_projects_api_keys" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_api_keys_deleted_at" to table: "api_keys"
CREATE INDEX "idx_api_keys_deleted_at" ON "api_keys" ("deleted_at");
-- Create index "idx_api_keys_key" to table: "api_keys"
CREATE UNIQUE INDEX "idx_api_keys_key" ON "api_keys" ("key");
-- Create index "idx_api_keys_project_id" to table: "api_keys"
CREATE INDEX "idx_api_keys_project_id" ON "api_keys" ("project_id");
-- Create index "idx_api_keys_user_id" to table: "api_keys"
CREATE INDEX "idx_api_keys_user_id" ON "api_keys" ("user_id");
-- Create "event_channels" table
CREATE TABLE "event_channels" (
  "id" text NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "description" text NULL,
  "color" text NULL,
  "retention_days" smallint NULL,
  "project_id" text NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "required_tags" text[] NULL,
  "metadata_schema" jsonb NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "uni_event_channels_slug" UNIQUE ("slug"),
  CONSTRAINT "fk_projects_event_channels" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_event_channels_deleted_at" to table: "event_channels"
CREATE INDEX "idx_event_channels_deleted_at" ON "event_channels" ("deleted_at");
-- Create index "idx_event_channels_project_id_name" to table: "event_channels"
CREATE UNIQUE INDEX "idx_event_channels_project_id_name" ON "event_channels" ("project_id", "name");
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
  "invited_by_id" text NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_organizations_members" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT "fk_team_memberships_invited_by" FOREIGN KEY ("invited_by_id") REFERENCES "users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT "fk_team_memberships_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_team_memberships_deleted_at" to table: "team_memberships"
CREATE INDEX "idx_team_memberships_deleted_at" ON "team_memberships" ("deleted_at");
-- Create index "idx_team_memberships_organization_id" to table: "team_memberships"
CREATE INDEX "idx_team_memberships_organization_id" ON "team_memberships" ("organization_id");
-- Create index "idx_team_memberships_user_id" to table: "team_memberships"
CREATE INDEX "idx_team_memberships_user_id" ON "team_memberships" ("user_id");
