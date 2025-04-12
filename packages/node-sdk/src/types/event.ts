export interface EventLogPayloadWithProject {
	/**
	 * The project ID this event belongs to
	 */
	project_id: string;
	/**
	 * The name of the event
	 */
	name: string;
	/**
	 * The channel slug
	 */
	channel?: string;
	/**
	 * Description of the event
	 */
	description?: string;
	/**
	 * Parser to use for description
	 */
	parser?: "text" | "markdown";
	/**
	 * List of tags to categorize the event
	 */
	tags?: string[];
	/**
	 * Additional structured data associated with the event
	 */
	metadata?: Record<string, unknown>;
	/**
	 * Custom timestamp for the event
	 * Default: current time
	 */
	timestamp?: Date | string;
}

export type EventLogPayload = Omit<EventLogPayloadWithProject, "project_id">;
