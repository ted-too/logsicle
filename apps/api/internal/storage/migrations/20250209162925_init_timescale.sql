-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create updated "app_logs" table
CREATE TABLE "app_logs" (
    "id" text NOT NULL,
    "project_id" text NOT NULL,
    "channel_id" text NULL,
    -- Always available fields
    "level" text NOT NULL,
    "message" text NOT NULL,
    "fields" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "timestamp" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Optional fields
    "caller" text NULL,
    "function" text NULL,
    -- Configuration-time fields
    "service_name" text NOT NULL,
    "version" text NULL,
    "environment" text NULL,
    "host" text NULL,
    
    -- Primary key and foreign keys
    PRIMARY KEY ("timestamp", "id"),
    FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("channel_id") REFERENCES "app_log_channels" ("id") ON DELETE CASCADE
);
-- Essential indexes for common queries
CREATE INDEX "idx_app_logs_project_time" ON "app_logs" ("project_id", "timestamp" DESC);
CREATE INDEX "idx_app_logs_channel_time" ON "app_logs" ("channel_id", "timestamp" DESC);
CREATE INDEX "idx_app_logs_level_time" ON "app_logs" ("level", "timestamp" DESC);
CREATE INDEX "idx_app_logs_service_time" ON "app_logs" ("service_name", "timestamp" DESC);
-- Environment-based queries
CREATE INDEX "idx_app_logs_env_time" ON "app_logs" ("environment", "timestamp" DESC) 
WHERE "environment" IS NOT NULL;
-- Full-text search on message
CREATE INDEX "idx_app_logs_message_trgm" ON "app_logs" 
USING gin (message gin_trgm_ops);
-- JSONB fields index for querying structured data
CREATE INDEX "idx_app_logs_fields" ON "app_logs" 
USING gin ("fields");
-- Compound index for common filtering scenarios
CREATE INDEX "idx_app_logs_common_filters" ON "app_logs" 
("project_id", "service_name", "level", "timestamp" DESC);
-- TimescaleDB specific configurations
SELECT create_hypertable('app_logs', by_range('timestamp', INTERVAL '3 days'));
-- Configure compression
ALTER TABLE "app_logs" SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'project_id,service_name',
    timescaledb.compress_orderby = 'timestamp DESC'
);
-- Add compression policy (compress data older than 7 days)
SELECT add_compression_policy('app_logs', INTERVAL '7 days');
-- Add retention policy (90 days)
SELECT add_retention_policy('app_logs', INTERVAL '90 days');
-- Create views for common queries (optional)
-- CREATE VIEW recent_errors AS
-- SELECT *
-- FROM app_logs
-- WHERE level = 'error'
-- AND timestamp > NOW() - INTERVAL '24 hours'
-- ORDER BY timestamp DESC;

-- Create parser type enum
CREATE TYPE parser_type AS ENUM ('text', 'markdown');
-- Create "event_logs" table
CREATE TABLE "event_logs" (
  "id" text NOT NULL,
  "project_id" text NOT NULL,
  "channel_id" text NULL,
  "name" text NULL,
  "description" text NULL,
  "parser" parser_type NOT NULL DEFAULT 'text',
  "metadata" jsonb NULL,
  "tags" jsonb NULL,
  "timestamp" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("timestamp", "id"),
  FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  FOREIGN KEY ("channel_id") REFERENCES "event_channels" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
-- Create index "idx_event_logs_project_id" to table: "event_logs"
CREATE INDEX "idx_event_logs_project_id" ON "event_logs" ("project_id", "timestamp" DESC);
-- Create index "idx_event_logs_channel_id" to table: "event_logs"
CREATE INDEX "idx_event_logs_channel_id" ON "event_logs" ("channel_id", "timestamp" DESC);
-- Create index "idx_event_logs_name" to table: "event_logs"
CREATE INDEX "idx_event_logs_name" ON "event_logs" ("name", "timestamp" DESC) WHERE "name" IS NOT NULL;
-- TimescaleDB
SELECT create_hypertable('event_logs', by_range('timestamp', INTERVAL '3 days'));
ALTER TABLE "event_logs" SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'project_id'
);
SELECT add_compression_policy('event_logs', INTERVAL '7 days');
SELECT add_retention_policy('event_logs', INTERVAL '90 days');

-- Create "traces" table
CREATE TABLE "traces" (
  "id" text NOT NULL,
  "project_id" text NOT NULL,
  "channel_id" text NULL,
  "name" text NOT NULL,
  "value" numeric NOT NULL,
  "labels" jsonb NULL,
  "timestamp" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("timestamp", "id"),
  FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  FOREIGN KEY ("channel_id") REFERENCES "trace_channels" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
-- Create index "idx_traces_project_id" to table: "traces"
CREATE INDEX "idx_traces_project_id" ON "traces" ("project_id", "timestamp" DESC);
-- Create index "idx_event_logs_channel_id" to table: "traces"
CREATE INDEX "idx_traces_channel_id" ON "traces" ("channel_id", "timestamp" DESC);
-- Create index "idx_traces_name" to table: "traces"
CREATE INDEX "idx_traces_name" ON "traces" ("name", "timestamp" DESC);
-- TimescaleDB
SELECT create_hypertable('traces', by_range('timestamp', INTERVAL '3 days'));
ALTER TABLE "traces" SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'project_id'
);
SELECT add_compression_policy('traces', INTERVAL '7 days');
SELECT add_retention_policy('traces', INTERVAL '90 days');

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
  "timestamp" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("timestamp", "id"),
  FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  FOREIGN KEY ("channel_id") REFERENCES "request_log_channels" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
-- Create index "idx_request_logs_project_id" to table: "request_logs"
CREATE INDEX "idx_request_logs_project_id" ON "request_logs" ("project_id", "timestamp" DESC);
-- Create index "idx_request_logs_channel_id" to table: "request_logs"
CREATE INDEX "idx_request_logs_channel_id" ON "request_logs" ("channel_id", "timestamp" DESC);
-- Create index "idx_request_logs_method" to table: "request_logs"
CREATE INDEX "idx_request_logs_method" ON "request_logs" ("method", "timestamp" DESC);
-- Create index "idx_request_logs_path" to table: "request_logs"
CREATE INDEX "idx_request_logs_path" ON "request_logs" ("path", "timestamp" DESC);
-- Create index "idx_request_logs_status_code" to table: "request_logs"
CREATE INDEX "idx_request_logs_status_code" ON "request_logs" ("status_code", "timestamp" DESC);
-- TimescaleDB
SELECT create_hypertable('request_logs', by_range('timestamp', INTERVAL '3 days'));
ALTER TABLE "request_logs" SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'project_id'
);
SELECT add_compression_policy('request_logs', INTERVAL '7 days');
SELECT add_retention_policy('request_logs', INTERVAL '90 days');
