-- Create "users" table
CREATE TABLE "users" (
  "id" text NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "external_oauth_id" text NOT NULL,
  "email" text NULL,
  "name" text NULL,
  "has_onboarded" boolean NULL DEFAULT false,
  "last_login_at" timestamptz NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_users_deleted_at" to table: "users"
CREATE INDEX "idx_users_deleted_at" ON "users" ("deleted_at");
-- Create index "idx_users_email" to table: "users"
CREATE UNIQUE INDEX "idx_users_email" ON "users" ("email");
-- Create index "idx_users_external_oauth_id" to table: "users"
CREATE UNIQUE INDEX "idx_users_external_oauth_id" ON "users" ("external_oauth_id");
-- Create "projects" table
CREATE TABLE "projects" (
  "id" text NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "allowed_origins" text[] NULL,
  "log_retention_days" bigint NULL DEFAULT 30,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_users_projects" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_projects_deleted_at" to table: "projects"
CREATE INDEX "idx_projects_deleted_at" ON "projects" ("deleted_at");
-- Create index "idx_projects_user_id" to table: "projects"
CREATE INDEX "idx_projects_user_id" ON "projects" ("user_id");
-- Create "api_keys" table
CREATE TABLE "api_keys" (
  "id" text NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "project_id" text NOT NULL,
  "name" text NOT NULL,
  "key" text NOT NULL,
  "masked_key" text NOT NULL,
  "scopes" text[] NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_projects_api_keys" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_api_keys_deleted_at" to table: "api_keys"
CREATE INDEX "idx_api_keys_deleted_at" ON "api_keys" ("deleted_at");
-- Create index "idx_api_keys_key" to table: "api_keys"
CREATE UNIQUE INDEX "idx_api_keys_key" ON "api_keys" ("key");
-- Create index "idx_api_keys_project_id" to table: "api_keys"
CREATE INDEX "idx_api_keys_project_id" ON "api_keys" ("project_id");
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
  "required_tags" text[] NULL,
  "metadata_schema" jsonb NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_projects_event_channels" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_event_channels_deleted_at" to table: "event_channels"
CREATE INDEX "idx_event_channels_deleted_at" ON "event_channels" ("deleted_at");
-- Create index "idx_event_channels_project_id_name" to table: "event_channels"
CREATE UNIQUE INDEX "idx_event_channels_project_id_name" ON "event_channels" ("project_id", "name");
