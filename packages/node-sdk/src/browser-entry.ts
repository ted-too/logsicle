import { AppConsoleTransport } from "@/transports/app-console";
import { AppStructuredLogTransport } from "@/transports/app-structured";
import { EventTransport } from "@/transports/event";
import { RequestTransport } from "@/transports/request";
import type { LogsicleConfig } from "@/types";
import { BrowserLogsicleClient } from "@/browser";

class BrowserAppLogTransport extends AppStructuredLogTransport {
  protected getHostname(): string {
    return window.location.hostname;
  }
}

export class LogsicleClient extends BrowserLogsicleClient {
  public app: BrowserAppLogTransport;
  public event: EventTransport;
  public request: RequestTransport;
  public console: AppConsoleTransport;

  constructor(config: LogsicleConfig) {
    super(config);

    this.app = new BrowserAppLogTransport(this);
    this.console = new AppConsoleTransport(this.app);
    this.event = new EventTransport(this);
    this.request = new RequestTransport(this);
  }
}

export * from "@/types";
