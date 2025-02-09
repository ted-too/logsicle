-- Modify "app_log_channels" table
ALTER TABLE "app_log_channels" ALTER COLUMN "retention_days" TYPE smallint, ALTER COLUMN "retention_days" DROP DEFAULT;
-- Modify "event_channels" table
ALTER TABLE "event_channels" ALTER COLUMN "retention_days" TYPE smallint, ALTER COLUMN "retention_days" DROP DEFAULT;
-- Modify "request_log_channels" table
ALTER TABLE "request_log_channels" ALTER COLUMN "retention_days" TYPE smallint, ALTER COLUMN "retention_days" DROP DEFAULT;
-- Modify "trace_channels" table
ALTER TABLE "trace_channels" ALTER COLUMN "retention_days" TYPE smallint, ALTER COLUMN "retention_days" DROP DEFAULT;
