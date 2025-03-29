-- Add level column to request_logs table
ALTER TABLE "request_logs" ADD COLUMN "level" text NOT NULL DEFAULT 'info';

-- Create index for level column
CREATE INDEX "idx_request_logs_level_time" 
ON "request_logs" ("level", "timestamp" DESC);
