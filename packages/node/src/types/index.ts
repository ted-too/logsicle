export interface LogsicleConfig {
  apiKey: string;
  projectId: string;
  endpoint?: {
    apiUrl: string;
    v?: number;
  };
  /**
   * The environment this service is running in.
   * Predefined values: "development", "staging", "production"
   * Custom environments are also supported.
   * Default: "development"
   */
  environment?: ("development" | "staging" | "production") | `${string}`;
  serviceName?: string;
  version?: string;
  /**
   * Enable debug mode to log internal errors
   */
  debug?: boolean;
  /**
   * Options for the log queue
   */
  queueOptions?: {
    /**
     * How often to flush the queue in milliseconds
     * Default: 1000 (1 second)
     */
    flushIntervalMs?: number;
    /**
     * Maximum number of retries for failed requests
     * Default: 3
     */
    maxRetries?: number;
    /**
     * Maximum number of items to send in a single batch
     * Default: 50
     */
    maxBatchSize?: number;
  };
  /**
   * Browser-specific options
   */
  browserOptions?: {
    /**
     * Whether to use the Navigator.sendBeacon API for sending logs during page unload
     * Default: true
     */
    useBeacon?: boolean;
  };
}

export interface AppLogOptions {
  /**
   * The severity level of the log
   * Default: "info"
   */
  level?: LogLevel;
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
   * The hostname of the machine generating the log
   */
  host?: string;
  /**
   * Custom timestamp for the log entry
   * Default: current time
   */
  timestamp?: Date;
}

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

export interface EventLogOptions {
  /**
   * Unique identifier for the event channel
   */
  channelId?: string;
  /**
   * Human-readable name for the event channel
   */
  channelName?: string;
  /**
   * List of tags to categorize the event
   */
  tags?: string[];
  /**
   * Additional structured data associated with the event
   */
  metadata?: Record<string, unknown>;
  /**
   * Custom timestamp for the event
   * Default: current time
   */
  timestamp?: Date;
}
