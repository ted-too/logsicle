import { useEffect, useState } from "react";

interface AppLog {
  id: string;
  project_id: string;
  channel_id?: string;
  level: string;
  message: string;
  metadata?: Record<string, string | number | boolean | null>;
  tags?: string[];
  timestamp: string;
}

type AppLogEvent = {
  type: "app";
  data: AppLog;
};

export function useAppLogStream(
  projectId: string,
  options?: {
    enabled?: boolean;
    callback?: (event: AppLogEvent) => unknown | Promise<unknown>;
  }
) {
  const [logs, setLogs] = useState<AppLogEvent[]>([]);
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
      const appLog: AppLogEvent = JSON.parse(event.data);
      setLogs((prev) => [appLog, ...prev].slice(0, 1000));

      if (options?.callback) {
        try {
          await options.callback(appLog);
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

  return logs;
}
