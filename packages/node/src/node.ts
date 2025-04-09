import { NodeLogsicleClient } from "@/node-client";
import { AppConsoleTransport } from "@/transports/app-console";
import { AppStructuredLogTransport } from "@/transports/app-structured";
import { EventTransport } from "@/transports/event";
import { LogsicleConfig } from "@/types";
import * as os from "os";

export {
  shutdownAll,
  installExpressShutdownHandler,
  installHttpShutdownHandler,
} from "@/utils/node-shutdown";

class NodeAppLogTransport extends AppStructuredLogTransport {
  protected getHostname(): string {
    return os.hostname();
  }
}

export class LogsicleClient extends NodeLogsicleClient {
  public app: NodeAppLogTransport;
  public event: EventTransport;
  public console: AppConsoleTransport;

  constructor(config: LogsicleConfig) {
    super(config);

    this.app = new NodeAppLogTransport(this);
    this.event = new EventTransport(this);
    this.console = new AppConsoleTransport(this.app);
  }
}
