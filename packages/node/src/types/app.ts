/**
 * Log severity levels from least to most severe
 */
export type LogLevel =
  | "debug"
  | "info"
  | "warning"
  | "error"
  | "fatal"
  | "trace";

export interface AppLogPayloadWithProject {
  /**
   * The project ID this log belongs to
   */
  project_id: string;
  /**
   * The severity level of the log
   */
  level: LogLevel;
  /**
   * The log message
   */
  message: string;
  /**
   * Additional structured data to include with the log
   */
  fields?: Record<string, unknown>;
  /**
   * The name of the file or module that generated the log
   */
  caller?: string;
  /**
   * The function or method name that generated the log
   */
  function?: string;
  /**
   * The name of the service generating the log
   */
  service_name: string;
  /**
   * The version of the service
   */
  version?: string;
  /**
   * Custom timestamp for the log entry
   * Auto-formats to ISO 8601 format
   * Default: current time
   */
  timestamp?: Date | string;
  /**
   * The environment (e.g. production, staging, development)
   */
  environment?: string;
  /**
   * The hostname of the machine generating the log
   */
  host?: string;
}

export type AppLogPayload = Omit<AppLogPayloadWithProject, "project_id">;

export type AppLogPayloadNoLevel = Omit<AppLogPayload, "level">;