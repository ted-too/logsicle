export interface RequestLogPayloadWithProject {
  /**
   * The project ID this request log belongs to
   */
  project_id: string;
  /**
   * HTTP method used in the request
   */
  method: string;
  /**
   * URL path of the request
   */
  path: string;
  /**
   * HTTP status code of the response
   */
  status_code: number;
  /**
   * Duration of the request in milliseconds
   */
  duration: number;
  /**
   * Request body (if captured)
   */
  request_body?: Record<string, any>;
  /**
   * Response body (if captured)
   */
  response_body?: Record<string, any>;
  /**
   * HTTP headers
   */
  headers?: Record<string, any>;
  /**
   * URL query parameters
   */
  query_params?: Record<string, any>;
  /**
   * User agent string
   */
  user_agent?: string;
  /**
   * IP address of the client
   */
  ip_address: string;
  /**
   * HTTP protocol version
   */
  protocol?: string;
  /**
   * Host header or server name
   */
  host?: string;
  /**
   * Error message if request failed
   */
  error?: string;
  /**
   * Timestamp when the request occurred
   * Auto-formats to ISO 8601 format
   * Default: current time
   */
  timestamp?: Date | string;
}

export type RequestLogPayload = Omit<
  RequestLogPayloadWithProject,
  "project_id"
>;

export interface RequestLogInput
  extends Omit<RequestLogPayloadWithProject, "project_id"> {
  /**
   * Custom properties to include in the request log
   */
  metadata?: Record<string, any>;
}
