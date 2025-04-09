import { LogsicleClient } from "@/client";
import { AppLogOptions } from "@/types";

export class AppStructuredLogTransport {
  private client: LogsicleClient;

  constructor(client: LogsicleClient) {
    this.client = client;
  }

  async log(message: string, options: AppLogOptions = {}): Promise<void> {
    const config = this.client.getConfig();

    const payload = {
      project_id: config.projectId,
      level: options.level || "info",
      message,
      fields: options.fields || {},
      caller: options.caller,
      function: options.function,
      service_name: config.serviceName,
      version: config.version,
      environment: config.environment,
      host: options.host || this.getHostname(),
      timestamp: options.timestamp
        ? options.timestamp.toISOString()
        : new Date().toISOString(),
    };

    await this.client.sendToApi("/v1/ingest/app", payload);
  }

  // Convenience methods for different log levels
  async debug(
    message: string,
    options: Omit<AppLogOptions, "level"> = {}
  ): Promise<void> {
    return this.log(message, { ...options, level: "debug" });
  }

  async info(
    message: string,
    options: Omit<AppLogOptions, "level"> = {}
  ): Promise<void> {
    return this.log(message, { ...options, level: "info" });
  }

  async warning(
    message: string,
    options: Omit<AppLogOptions, "level"> = {}
  ): Promise<void> {
    return this.log(message, { ...options, level: "warning" });
  }

  async error(
    message: string,
    options: Omit<AppLogOptions, "level"> = {}
  ): Promise<void> {
    return this.log(message, { ...options, level: "error" });
  }

  async fatal(
    message: string,
    options: Omit<AppLogOptions, "level"> = {}
  ): Promise<void> {
    return this.log(message, { ...options, level: "fatal" });
  }

  protected getHostname(): string {
    // This will be different in Node.js vs browser environments
    return "unknown";
  }
}
