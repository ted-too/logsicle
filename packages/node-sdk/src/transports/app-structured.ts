import type { AppLogPayload, AppLogInput, AppLogInputWithLevel } from "@/types";
import type { LogsicleClient as BrowserLogsicleClient } from "@/browser-entry";
import type { LogsicleClient as NodeLogsicleClient } from "@/server-entry";

type LogsicleClient = BrowserLogsicleClient | NodeLogsicleClient;

export class AppStructuredLogTransport {
	private client: LogsicleClient;

	constructor(client: LogsicleClient) {
		this.client = client;
	}

	async log(message: string, options?: AppLogInputWithLevel): Promise<void> {
		const config = this.client.getConfig();

		const payload: AppLogPayload = {
			...options,
			service_name: options?.service_name || config.serviceName || "unknown",
			level: options?.level || "info",
			message,
			host: options?.host || this.getHostname(),
			timestamp: (options?.timestamp
				? new Date(options.timestamp)
				: new Date()
			).toISOString(),
		};

		this.client.enqueue({
			type: "app",
			payload: {
				project_id: config.projectId,
				...payload,
			},
		});
	}

	// Convenience methods for different log levels
	async debug(message: string, options: AppLogInput): Promise<void> {
		return this.log(message, { ...options, level: "debug" });
	}

	async info(message: string, options: AppLogInput): Promise<void> {
		return this.log(message, { ...options, level: "info" });
	}

	async warning(message: string, options: AppLogInput): Promise<void> {
		return this.log(message, { ...options, level: "warning" });
	}

	async error(message: string, options: AppLogInput): Promise<void> {
		return this.log(message, { ...options, level: "error" });
	}

	async fatal(message: string, options: AppLogInput): Promise<void> {
		return this.log(message, { ...options, level: "fatal" });
	}

	protected getHostname(): string {
		// This will be different in Node.js vs browser environments
		return "unknown";
	}
}
