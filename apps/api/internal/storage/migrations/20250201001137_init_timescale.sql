CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Create "app_logs" table
CREATE TABLE "app_logs" (
  "id" text NOT NULL,
  "project_id" text NOT NULL,
  "channel_id" text NULL,
  "level" text NOT NULL,
  "message" text NOT NULL,
  "metadata" jsonb NULL,
  "stack_trace" text NULL,
  "service_name" text NULL,
  "timestamp" timestamptz NOT NULL
);
-- Create index "idx_app_logs_channel_id" to table: "app_logs"
CREATE INDEX "idx_app_logs_channel_id" ON "app_logs" ("channel_id", "timestamp" DESC);
-- Create index "idx_app_logs_level" to table: "app_logs"
CREATE INDEX "idx_app_logs_level" ON "app_logs" ("level", "timestamp" DESC);
-- Create index "idx_app_logs_project_id" to table: "app_logs"
CREATE INDEX "idx_app_logs_project_id" ON "app_logs" ("project_id", "timestamp" DESC);
-- Create index "idx_app_logs_service_name" to table: "app_logs"
CREATE INDEX "idx_app_logs_service_name" ON "app_logs" ("service_name", "timestamp" DESC);
-- Create index "idx_app_logs_id_timestamp" to table: "app_logs"
CREATE UNIQUE INDEX "idx_app_logs_id_timestamp" ON "app_logs" (id, "timestamp" DESC);
-- TimescaleDB
SELECT create_hypertable('app_logs', by_range('timestamp', INTERVAL '1 day'));

-- Create "event_logs" table
CREATE TABLE "event_logs" (
  "id" text NOT NULL,
  "project_id" text NOT NULL,
  "channel_id" text NULL,
  "name" text NULL,
  "description" text NULL,
  "metadata" jsonb NULL,
  "tags" jsonb NULL,
  "timestamp" timestamptz NOT NULL
);
-- Create index "idx_event_logs_channel_id" to table: "event_logs"
CREATE INDEX "idx_event_logs_channel_id" ON "event_logs" ("channel_id", "timestamp" DESC);
-- Create index "idx_event_logs_project_id" to table: "event_logs"
CREATE INDEX "idx_event_logs_project_id" ON "event_logs" ("project_id", "timestamp" DESC);
-- Create index "idx_event_logs_name" to table: "event_logs"
CREATE INDEX "idx_event_logs_name" ON "event_logs" ("name", "timestamp" DESC);
-- Create index "idx_event_name_id_timestamp" to table: "event_logs"
CREATE UNIQUE INDEX "idx_event_logs_id_timestamp" ON "event_logs" ("id", "timestamp" DESC);
-- TimescaleDB
SELECT create_hypertable('event_logs', by_range('timestamp', INTERVAL '1 day'));

-- Create "metrics" table
CREATE TABLE "metrics" (
  "id" text NOT NULL,
  "project_id" text NOT NULL,
  "name" text NOT NULL,
  "value" numeric NOT NULL,
  "labels" jsonb NULL,
  "timestamp" timestamptz NOT NULL
);
-- Create index "idx_metrics_name" to table: "metrics"
CREATE INDEX "idx_metrics_name" ON "metrics" ("name", "timestamp" DESC);
-- Create index "idx_metrics_project_id" to table: "metrics"
CREATE INDEX "idx_metrics_project_id" ON "metrics" ("project_id", "timestamp" DESC);
-- Create index "idx_metrics_id_timestamp" to table: "metrics"
CREATE INDEX "idx_metrics_id_timestamp" ON "metrics" ("id", "timestamp" DESC);
-- TimescaleDB
SELECT create_hypertable('metrics', by_range('timestamp', INTERVAL '1 day'));

-- Create "request_logs" table
CREATE TABLE "request_logs" (
  "id" text NOT NULL,
  "project_id" text NOT NULL,
  "channel_id" text NULL,
  "method" text NOT NULL,
  "path" text NOT NULL,
  "status_code" bigint NOT NULL,
  "duration" bigint NOT NULL,
  "request_body" jsonb NULL,
  "response_body" jsonb NULL,
  "user_agent" text NULL,
  "ip_address" text NULL,
  "timestamp" timestamptz NOT NULL
);
-- Create index "idx_request_logs_channel_id" to table: "request_logs"
CREATE INDEX "idx_request_logs_channel_id" ON "request_logs" ("channel_id", "timestamp" DESC);
-- Create index "idx_request_logs_project_id" to table: "request_logs"
CREATE INDEX "idx_request_logs_project_id" ON "request_logs" ("project_id", "timestamp" DESC);
-- Create index "idx_request_logs_id_timestamp" to table: "request_logs"
CREATE INDEX "idx_request_logs_id_timestamp" ON "request_logs" ("id", "timestamp" DESC);
-- TimescaleDB
SELECT create_hypertable('request_logs', by_range('timestamp', INTERVAL '1 day'));