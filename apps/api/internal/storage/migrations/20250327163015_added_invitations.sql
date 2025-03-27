-- Create "invitations" table
CREATE TABLE "invitations" (
  "id" text NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  "deleted_at" timestamptz NULL,
  "email" text NOT NULL,
  "organization_id" text NOT NULL,
  "role" text NOT NULL DEFAULT 'member',
  "token" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "invited_by_id" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_invitations_invited_by" FOREIGN KEY ("invited_by_id") REFERENCES "users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT "fk_invitations_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "idx_invitations_deleted_at" to table: "invitations"
CREATE INDEX "idx_invitations_deleted_at" ON "invitations" ("deleted_at");
-- Create index "idx_invitations_invited_by_id" to table: "invitations"
CREATE INDEX "idx_invitations_invited_by_id" ON "invitations" ("invited_by_id");
-- Create index "idx_invitations_organization_id" to table: "invitations"
CREATE INDEX "idx_invitations_organization_id" ON "invitations" ("organization_id");
-- Create index "idx_invitations_token" to table: "invitations"
CREATE UNIQUE INDEX "idx_invitations_token" ON "invitations" ("token");
