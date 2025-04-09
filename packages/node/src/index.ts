import { LogsicleClient as BaseClient } from "@/client";
import { AppStructuredLogTransport } from "@/transports/app-structured";
import { EventTransport } from "@/transports/event";
import { LogsicleConfig } from "@/types";

// Export types
export * from "@/types";

// Export the base client with minimal functionality
export class LogsicleClient extends BaseClient {
  public app: AppStructuredLogTransport;
  public event: EventTransport;

  constructor(config: LogsicleConfig) {
    super(config);

    this.app = new AppStructuredLogTransport(this);
    this.event = new EventTransport(this);
  }
}
