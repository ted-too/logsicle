import type { Client, RequestLogPayload, RequestLogInput } from "@/types";

export class RequestTransport {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Log an HTTP request
   *
   * @param options RequestLogInput object with request details
   * @returns Promise<void>
   */
  async log(options: RequestLogInput): Promise<void> {
    const config = this.client.getConfig();

    const payload: RequestLogPayload = {
      ...options,
      timestamp: (options?.timestamp
        ? new Date(options.timestamp)
        : new Date()
      ).toISOString(),
    };

    this.client.enqueue({
      type: "request",
      payload: {
        project_id: config.projectId,
        ...payload,
      },
    });
  }

  /**
   * Simplified method to log a basic HTTP request with minimal information
   *
   * @param method HTTP method (GET, POST, etc.)
   * @param path URL path
   * @param statusCode HTTP status code
   * @param durationMs Duration in milliseconds
   * @param ipAddress IP address of the client
   * @param options Additional request details
   * @returns Promise<void>
   */
  async logRequest(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    ipAddress: string,
    options?: Partial<RequestLogInput>
  ): Promise<void> {
    return this.log({
      method,
      path,
      status_code: statusCode,
      duration: durationMs,
      ip_address: ipAddress,
      ...options,
    });
  }
}
