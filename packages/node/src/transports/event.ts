import type { LogsicleClient } from "@/client";
import type { EventLogOptions } from "@/types";

export class EventTransport {
	private client: LogsicleClient;

	constructor(client: LogsicleClient) {
		this.client = client;
	}

	async send(name: string, options: EventLogOptions = {}): Promise<void> {
		const config = this.client.getConfig();

		if (!options.channelId && !options.channelName) {
			throw new Error("Either channelId or channelName must be provided");
		}

		const payload = {
			project_id: config.projectId,
			channel: options.channelName,
			channel_id: options.channelId,
			name,
			tags: options.tags || [],
			metadata: options.metadata || {},
			timestamp: options.timestamp
				? options.timestamp.toISOString()
				: new Date().toISOString(),
		};

		await this.client.sendToApi("/v1/ingest/event", payload);
	}
}
