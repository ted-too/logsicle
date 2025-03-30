import { useEffect, useState } from "react";
import type { EventLog } from "@repo/api";

type EventLogEvent = {
  type: "event";
  data: EventLog;
};

export function useEventStream(
  projectId: string,
  options?: {
    enabled?: boolean;
    callback?: (event: EventLogEvent) => unknown | Promise<unknown>;
  }
) {
  const [events, setEvents] = useState<EventLogEvent[]>([]);
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;

    const url = new URL(
      `${import.meta.env.VITE_API_URL}/v1/projects/${projectId}/events/stream`
    );

    const eventSource = new EventSource(url.toString(), {
      withCredentials: true,
    });

    eventSource.onmessage = async (event) => {
      const eventLog: EventLogEvent = JSON.parse(event.data);
      setEvents((prev) => [eventLog, ...prev].slice(0, 1000));

      if (options?.callback) {
        try {
          await options.callback(eventLog);
        } catch (error) {
          console.error("Error executing callback:", error);
        }
      }
    };

    eventSource.onerror = (error) => {
      console.error("EventSource failed:", error);
    };

    return () => {
      eventSource.close();
    };
  }, [projectId, options, enabled]);

  return events;
}
