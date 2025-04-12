import * as os from "node:os";
import { NodeLogsicleClient } from "@/server";
import { AppConsoleTransport } from "@/transports/app-console";
import { AppStructuredLogTransport } from "@/transports/app-structured";
import { EventTransport } from "@/transports/event";
import { RequestTransport } from "@/transports/request";
import type { LogsicleConfig } from "@/types";

class NodeAppLogTransport extends AppStructuredLogTransport {
  protected getHostname(): string {
    return os.hostname();
  }
}

export class LogsicleClient extends NodeLogsicleClient {
  public app: NodeAppLogTransport;
  public event: EventTransport;
  public request: RequestTransport;
  public console: AppConsoleTransport;

  constructor(config: LogsicleConfig) {
    super(config);

    this.app = new NodeAppLogTransport(this);
    this.event = new EventTransport(this);
    this.request = new RequestTransport(this);
    this.console = new AppConsoleTransport(this.app);
  }
}

export * from "@/types";
