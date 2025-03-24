import { useEffect, useState } from "react";

interface EventLog {
	id: string;
	project_id: string;
	channel_id?: string;
	name: string;
	description: string;
	parser?: string;
	metadata?: Record<string, any>;
	tags?: string[];
	timestamp: string;
}

interface AppLog {
	id: string;
	project_id: string;
	channel_id?: string;
	level: "debug" | "info" | "warning" | "error";
	message: string;
	metadata?: Record<string, any>;
	stack_trace?: string;
	service_name: string;
	timestamp: string;
}

interface RequestLog {
	id: string;
	project_id: string;
	channel_id?: string;
	method: string;
	path: string;
	status_code: number;
	duration: number;
	request_body?: Record<string, any>;
	response_body?: Record<string, any>;
	user_agent?: string;
	ip_address: string;
	timestamp: string;
}

interface Metric {
	id: string;
	project_id: string;
	name: string;
	value: number;
	labels?: Record<string, any>;
	timestamp: string;
}

type LogEvent =
	| {
			type: "event";
			data: EventLog;
	  }
	| {
			type: "app";
			data: AppLog;
	  }
	| {
			type: "request";
			data: RequestLog;
	  }
	| {
			type: "metric";
			data: Metric;
	  };

export function useLogStream(
	projectId: string,
	options?: {
		enabled?: boolean;
		types?: Array<"event" | "app" | "request" | "metric">;
		callback?: (log: LogEvent) => any | Promise<any>;
	},
) {
	const [logs, setLogs] = useState<LogEvent[]>([]);
	const enabled = options?.enabled ?? true; // Default to true if not specified

	useEffect(() => {
		// If disabled, don't create the EventSource
		if (!enabled) return;

		// Build URL with query parameters
		const url = new URL(
			`${import.meta.env.VITE_API_URL}/v1/stream/${projectId}`,
		);

		// Add types to query parameters if specified
		if (options?.types && options.types.length > 0) {
			url.searchParams.set("types", options.types.join(","));
		}

		const eventSource = new EventSource(url.toString(), {
			withCredentials: true,
		});

		eventSource.onmessage = async (event) => {
			const logEvent: LogEvent = JSON.parse(event.data);
			setLogs((prev) => [logEvent, ...prev].slice(0, 1000));

			if (options?.callback) {
				try {
					await options.callback(logEvent);
				} catch (error) {
					console.error("Error executing callback:", error);
				}
			}
		};

		eventSource.onerror = (error) => {
			console.error("EventSource failed:", error);
			// TODO: Implement reconnection logic here if needed
		};

		return () => {
			eventSource.close();
		};
	}, [projectId, options, enabled]);

	return logs;
}
