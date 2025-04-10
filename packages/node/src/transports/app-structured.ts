import type { AppLogPayload, AppLogPayloadNoLevel, Client } from "@/types";

export class AppStructuredLogTransport {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	async log(message: string, options?: Partial<AppLogPayload>): Promise<void> {
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
	async debug(message: string, options: AppLogPayloadNoLevel): Promise<void> {
		return this.log(message, { ...options, level: "debug" });
	}

	async info(message: string, options: AppLogPayloadNoLevel): Promise<void> {
		return this.log(message, { ...options, level: "info" });
	}

	async warning(message: string, options: AppLogPayloadNoLevel): Promise<void> {
		return this.log(message, { ...options, level: "warning" });
	}

	async error(message: string, options: AppLogPayloadNoLevel): Promise<void> {
		return this.log(message, { ...options, level: "error" });
	}

	async fatal(message: string, options: AppLogPayloadNoLevel): Promise<void> {
		return this.log(message, { ...options, level: "fatal" });
	}

	protected getHostname(): string {
		// This will be different in Node.js vs browser environments
		return "unknown";
	}
}
