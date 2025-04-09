import { BrowserLogsicleClient } from "@/browser-client";
import { AppConsoleTransport } from "@/transports/app-console";
import { AppStructuredLogTransport } from "@/transports/app-structured";
import { EventTransport } from "@/transports/event";
import { LogsicleConfig } from "@/types";

class BrowserAppLogTransport extends AppStructuredLogTransport {
  protected getHostname(): string {
    return window.location.hostname;
  }
}

export class LogsicleClient extends BrowserLogsicleClient {
  public app: BrowserAppLogTransport;
  public event: EventTransport;
  public console: AppConsoleTransport;

  constructor(config: LogsicleConfig) {
    super(config);

    this.app = new BrowserAppLogTransport(this);
    this.event = new EventTransport(this);
    this.console = new AppConsoleTransport(this.app);
  }
}
