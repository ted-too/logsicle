import { useEffect, useState, useRef } from "react";
import type { RequestLog, ListRequestLogsRequest } from "@repo/api";

export function useRequestLogStream(
	projectId: string,
	query: ListRequestLogsRequest,
	options?: {
		enabled?: boolean;
		onEnd?: () => unknown | Promise<unknown>;
	},
) {
	const [logs, setLogs] = useState<RequestLog[]>([]);
	const enabled = options?.enabled ?? true;

	// Stabilize references to prevent unnecessary re-renders
	const queryRef = useRef(query);
	const optionsRef = useRef(options);
	const onEndRef = useRef(options?.onEnd);

	// Update refs when props change
	useEffect(() => {
		queryRef.current = query;
		optionsRef.current = options;
		onEndRef.current = options?.onEnd;
	}, [query, options]);

	useEffect(() => {
		if (!enabled) return;

		const url = new URL(
			`${import.meta.env.VITE_PUBLIC_API_URL || "https://api.logsicle.app"}/v1/projects/${projectId}/request/stream`,
		);

		const eventSource = new EventSource(url.toString(), {
			withCredentials: true,
		});

		eventSource.onmessage = async (event) => {
			try {
				const requestLog: RequestLog = JSON.parse(event.data);
				setLogs((prev) => [requestLog, ...prev].slice(0, 1000));
			} catch (error) {
				console.error("Error parsing event data:", error);
			}
		};

		eventSource.onerror = (error) => {
			console.error("EventSource failed:", error);
		};

		return () => {
			eventSource.close();
			setLogs([]);
			if (onEndRef.current) {
				onEndRef.current();
			}
		};
	}, [projectId, enabled]);

	return { logs };
}

