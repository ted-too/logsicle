import type { EventLogPayload } from "@/types";
import type { LogsicleClient as BrowserLogsicleClient } from "@/browser-entry";
import type { LogsicleClient as NodeLogsicleClient } from "@/server-entry";

type LogsicleClient = BrowserLogsicleClient | NodeLogsicleClient;
export class EventTransport {
  private client: LogsicleClient;

  constructor(client: LogsicleClient) {
    this.client = client;
  }

  async send(name: string, options: Partial<EventLogPayload>): Promise<void> {
    const config = this.client.getConfig();

    const payload: EventLogPayload = {
      ...options,
      name,
      timestamp: (options?.timestamp
        ? new Date(options.timestamp)
        : new Date()
      ).toISOString(),
    };

    this.client.enqueue({
      type: "event",
      payload: {
        project_id: config.projectId,
        ...payload,
      },
    });
  }
}
