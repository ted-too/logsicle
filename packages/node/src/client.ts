import { createFetch } from "@better-fetch/fetch";
import { LogsicleConfig } from "@/types";

export class LogsicleClient {
  protected config: LogsicleConfig;
  protected fetch: ReturnType<typeof createFetch>;
  protected queueManager: any; // Will be set by environment-specific implementations

  constructor(config: LogsicleConfig) {
    this.config = this.validateConfig(config);

    const baseURL =
      config.endpoint !== undefined
        ? `${config.endpoint.apiUrl}/v${config.endpoint.v || 1}`
        : "https://api.logsicle.com/v1";

    this.fetch = createFetch({
      baseURL,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/plain, application/json",
      },
      // Add retry logic for better reliability
      retry: {
        type: "exponential",
        attempts: 3,
        baseDelay: 500,
        maxDelay: 5000,
      },
    });
  }

  protected validateConfig(config: LogsicleConfig): LogsicleConfig {
    if (!config.apiKey) {
      throw new Error("API key is required");
    }

    if (!config.projectId) {
      throw new Error("Project ID is required");
    }

    return {
      environment: "development",
      serviceName: "default-service",
      version: "1.0.0",
      debug: false,
      queueOptions: {
        flushIntervalMs: 1000,
        maxRetries: 3,
        maxBatchSize: 50,
      },
      ...config,
    };
  }

  /**
   * Send a single item to the API
   * This is a protected method that will be used by environment-specific implementations
   */
  protected async sendSingleItem(endpoint: string, data: any): Promise<any> {
    try {
      const { data: responseData, error } = await this.fetch(endpoint, {
        method: "POST",
        body: data,
      });

      if (error) {
        throw error;
      }

      return responseData;
    } catch (error) {
      if (this.config.debug) {
        console.error("Failed to send data to Logsicle API:", error);
      }
      throw error;
    }
  }

  /**
   * Send multiple items in a batch request
   * This is a protected method that will be used by environment-specific implementations
   */
  protected async sendBatchItems(items: any[]): Promise<any> {
    try {
      const { data: responseData, error } = await this.fetch(
        "/v1/ingest/batch",
        {
          method: "POST",
          body: { items },
        }
      );

      if (error) {
        throw error;
      }

      return responseData;
    } catch (error) {
      if (this.config.debug) {
        console.error("Failed to send batch to Logsicle API:", error);
      }
      throw error;
    }
  }

  /**
   * Queue an item to be sent to the API
   * This method will be implemented by environment-specific clients
   */
  async sendToApi(_endpoint: string, _data: any): Promise<void> {
    throw new Error("Method not implemented. Use a platform-specific client.");
  }

  /**
   * Flush the queue and wait for all pending logs to be sent
   * This method will be implemented by environment-specific clients
   */
  async flush(): Promise<void> {
    throw new Error("Method not implemented. Use a platform-specific client.");
  }

  /**
   * Shutdown the client
   * This method will be implemented by environment-specific clients
   */
  async shutdown(): Promise<void> {
    throw new Error("Method not implemented. Use a platform-specific client.");
  }

  /**
   * Get the client configuration
   */
  getConfig(): LogsicleConfig {
    return this.config;
  }

  /**
   * Get the base URL for the API
   */
  getBaseUrl(): string {
    const config = this.getConfig();
    return config.endpoint !== undefined
      ? `${config.endpoint.apiUrl}/v${config.endpoint.v || 1}`
      : "https://api.logsicle.com/v1";
  }
}
