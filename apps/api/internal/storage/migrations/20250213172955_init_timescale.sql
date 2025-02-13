-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Function to handle jsonb to text
CREATE OR REPLACE FUNCTION jsonb_to_text(data jsonb)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
    SELECT string_agg(value::text, ' ')
    FROM jsonb_each_text($1);
$$;

-- Create updated "app_logs" table
CREATE TABLE "app_logs" (
    "id" text NOT NULL,
    "project_id" text NOT NULL,
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
    FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE
);
-- Essential indexes for common queries
CREATE INDEX "idx_app_logs_project_time" ON "app_logs" ("project_id", "timestamp" DESC);
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
-- Add tsvector columns for both message and fields
ALTER TABLE "app_logs" 
    ADD COLUMN message_tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('english', message)) STORED,
    ADD COLUMN fields_tsv tsvector
    GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(jsonb_to_text(fields), ''))
    ) STORED;

-- Create GIN indexes for both tsvector columns
CREATE INDEX "idx_app_logs_message_tsv" ON "app_logs" 
USING gin(message_tsv);

CREATE INDEX "idx_app_logs_fields_tsv" ON "app_logs" 
USING gin(fields_tsv);

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

-- Create enum for span kind
CREATE TYPE span_kind AS ENUM (
    'SPAN_KIND_UNSPECIFIED',
    'SPAN_KIND_INTERNAL',
    'SPAN_KIND_SERVER',
    'SPAN_KIND_CLIENT',
    'SPAN_KIND_PRODUCER',
    'SPAN_KIND_CONSUMER'
);

-- Create enum for span status
CREATE TYPE span_status AS ENUM (
    'STATUS_UNSET',
    'STATUS_OK',
    'STATUS_ERROR'
);

-- Create traces table aligned with OpenTelemetry
CREATE TABLE "traces" (
    "id" text NOT NULL,                    -- Span ID
    "trace_id" text NOT NULL,              -- Trace ID
    "parent_id" text NULL,                 -- Parent Span ID
    "project_id" text NOT NULL,
    "name" text NOT NULL,                  -- Operation name
    "kind" span_kind NOT NULL,
    "start_time" timestamptz NOT NULL,
    "end_time" timestamptz NOT NULL,
    "duration_ms" bigint NOT NULL,         -- Duration in milliseconds
    "status" span_status NOT NULL,
    "status_message" text NULL,
    -- Context
    "service_name" text NOT NULL,
    "service_version" text NULL,
    -- Additional data
    "attributes" jsonb NULL,               -- Key-value span attributes
    "events" jsonb NULL,                   -- Timeline events within the span
    "links" jsonb NULL,                    -- Links to other spans
    "resource_attributes" jsonb NULL,      -- Resource information
    "timestamp" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY ("timestamp", "id"),
    FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE
);

-- Indexes
CREATE INDEX "idx_traces_trace_id" ON "traces" ("trace_id", "timestamp" DESC);
CREATE INDEX "idx_traces_project_service" ON "traces" ("project_id", "service_name", "timestamp" DESC);
CREATE INDEX "idx_traces_name" ON "traces" ("name", "timestamp" DESC);
CREATE INDEX "idx_traces_status" ON "traces" ("status", "timestamp" DESC);
CREATE INDEX "idx_traces_duration" ON "traces" ("duration_ms", "timestamp" DESC);

-- TimescaleDB configuration
SELECT create_hypertable('traces', by_range('timestamp', INTERVAL '3 days'));
ALTER TABLE "traces" SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'project_id,service_name,trace_id',
    timescaledb.compress_orderby = 'timestamp DESC'
);
SELECT add_compression_policy('traces', INTERVAL '7 days');
SELECT add_retention_policy('traces', INTERVAL '90 days');

-- Create metric type enum
CREATE TYPE metric_type AS ENUM (
    'GAUGE',
    'SUM',
    'HISTOGRAM',
    'EXPONENTIAL_HISTOGRAM',
    'SUMMARY'
);

-- Create aggregation temporality enum
CREATE TYPE aggregation_temporality AS ENUM (
    'UNSPECIFIED',
    'DELTA',
    'CUMULATIVE'
);

-- Create metrics table
CREATE TABLE "metrics" (
    "id" text NOT NULL,
    "project_id" text NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "unit" text,
    "type" metric_type NOT NULL,
    
    -- Common fields
    "value" double precision,
    "timestamp" timestamptz NOT NULL,
    
    -- For Sum metrics
    "is_monotonic" boolean,
    
    -- For Histogram metrics
    "bounds" double precision[],
    "bucket_counts" bigint[],
    "count" bigint,
    "sum" double precision,
    
    -- For Summary metrics
    "quantile_values" jsonb,
    
    -- Context
    "service_name" text NOT NULL,
    "service_version" text,
    
    -- Additional attributes
    "attributes" jsonb,
    "resource_attributes" jsonb,
    
    -- Aggregation
    "aggregation_temporality" aggregation_temporality NOT NULL,
    
    PRIMARY KEY ("timestamp", "id"),
    FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX "idx_metrics_project" ON "metrics" ("project_id", "timestamp" DESC);
CREATE INDEX "idx_metrics_name" ON "metrics" ("name", "timestamp" DESC);
CREATE INDEX "idx_metrics_service" ON "metrics" ("service_name", "timestamp" DESC);
CREATE INDEX "idx_metrics_type" ON "metrics" ("type", "timestamp" DESC);

-- TimescaleDB configuration
SELECT create_hypertable('metrics', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- Compression policy
ALTER TABLE "metrics" SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'project_id,service_name,name,type',
    timescaledb.compress_orderby = 'timestamp DESC'
);

-- Add compression policy (compress data older than 1 day)
SELECT add_compression_policy('metrics', INTERVAL '1 day');

-- Add retention policy (90 days)
SELECT add_retention_policy('metrics', INTERVAL '90 days');

-- Create "request_logs" table
CREATE TABLE "request_logs" (
    "id" text NOT NULL,
    "project_id" text NOT NULL,
    "method" text NOT NULL,
    "path" text NOT NULL,
    "status_code" integer NOT NULL,
    "duration" bigint NOT NULL,           -- in milliseconds
    "request_body" jsonb NULL,
    "response_body" jsonb NULL,
    "headers" jsonb NULL,                 -- Added headers
    "query_params" jsonb NULL,            -- Added query parameters
    "user_agent" text NULL,
    "ip_address" text NOT NULL,
    "protocol" text NULL,                 -- Added protocol
    "host" text NULL,                     -- Added host
    "error" text NULL,                    -- Added error field
    "timestamp" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY ("timestamp", "id"),
    FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE
);

-- Create indexes for common queries
CREATE INDEX "idx_request_logs_project_time" 
ON "request_logs" ("project_id", "timestamp" DESC);

CREATE INDEX "idx_request_logs_method_time" 
ON "request_logs" ("method", "timestamp" DESC);

CREATE INDEX "idx_request_logs_path_time" 
ON "request_logs" ("path", "timestamp" DESC);

CREATE INDEX "idx_request_logs_status_time" 
ON "request_logs" ("status_code", "timestamp" DESC);

CREATE INDEX "idx_request_logs_host_time" 
ON "request_logs" ("host", "timestamp" DESC) 
    WHERE "host" IS NOT NULL;

CREATE INDEX "idx_request_logs_error_time" 
ON "request_logs" ("error", "timestamp" DESC) 
    WHERE "error" IS NOT NULL;

-- Compound index for common filtering scenarios
CREATE INDEX "idx_request_logs_common_filters" 
    ON "request_logs" ("project_id", "status_code", "method", "timestamp" DESC);

-- TimescaleDB configuration
SELECT create_hypertable('request_logs', by_range('timestamp', INTERVAL '3 days'));

-- Configure compression
ALTER TABLE "request_logs" SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'project_id,method',
    timescaledb.compress_orderby = 'timestamp DESC'
);

-- Add compression policy (compress data older than 7 days)
SELECT add_compression_policy('request_logs', INTERVAL '7 days');

-- Add retention policy (90 days)
SELECT add_retention_policy('request_logs', INTERVAL '90 days');
