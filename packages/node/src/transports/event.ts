import type { Client, EventLogPayload } from "@/types";

export class EventTransport {
	private client: Client;

	constructor(client: Client) {
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
