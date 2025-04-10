import type { BrowserLogsicleClient } from "@/browser";
import type { NodeLogsicleClient } from "@/server";
import type { AppLogPayloadWithProject } from "./app";
import type { EventLogPayloadWithProject } from "./event";

export interface LogsicleConfig {
	apiKey: string;
	projectId: string;
	endpoint?: {
		apiUrl: string;
		v?: number;
	};
	/**
	 * The environment this service is running in.
	 * Predefined values: "development", "staging", "production"
	 * Custom environments are also supported.
	 * Default: "development"
	 */
	environment?: ("development" | "staging" | "production") | `${string}`;
	serviceName?: string;
	version?: string;
	/**
	 * Enable debug mode to log internal errors
	 */
	debug?: boolean;
	/**
	 * Options for the log queue
	 */
	queueOptions?: {
		/**
		 * How often to flush the queue in milliseconds
		 * Default: 1000 (1 second)
		 */
		flushIntervalMs?: number;
		/**
		 * Maximum number of retries for failed requests
		 * Default: 3
		 */
		maxRetries?: number;
		/**
		 * Maximum number of items to send in a single batch
		 * Default: 50
		 */
		maxBatchSize?: number;
	};
	/**
	 * Browser-specific options
	 */
	browserOptions?: {
		/**
		 * Whether to use the Navigator.sendBeacon API for sending logs during page unload
		 * Default: true
		 */
		useBeacon?: boolean;
		/**
		 * URL to the web worker script for browser environments
		 * Default: '/logsicle-worker.js'
		 */
		workerUrl?: string;
	};
}

export interface QueueItem {
	data: ResourceData;
	addedAt: number;
	retries?: number;
	id?: string; // Optional unique identifier for tracking retries
}

export interface ItemDroppedPayload {
	type: string;
	reason?: "max-retries" | "bad-request";
	id: string; // Hash ID of the dropped item
}

export type AppResourceData = {
	type: "app";
	payload: AppLogPayloadWithProject;
};

export type EventResourceData = {
	type: "event";
	payload: EventLogPayloadWithProject;
};

export type ResourceData = AppResourceData | EventResourceData;

export type BatchFailedItem = {
	input: ResourceData;
	code: number;
	message: string;
};

export type BatchResponse = {
	processed: number;
	failed: BatchFailedItem[];
};

export type Client = BrowserLogsicleClient | NodeLogsicleClient;

export * from "./app";
export * from "./event";
