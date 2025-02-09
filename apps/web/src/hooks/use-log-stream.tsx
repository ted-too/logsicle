// apps/web/src/hooks/useLogStream.ts
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
  callback?: (log: LogEvent) => any | Promise<any>
) {
  const [logs, setLogs] = useState<LogEvent[]>([]);

  useEffect(() => {
    const eventSource = new EventSource(
      `${import.meta.env.PUBLIC_API_URL}/api/v1/stream/${projectId}`,
      { withCredentials: true }
    );

    eventSource.onmessage = async (event) => {
      const logEvent: LogEvent = JSON.parse(event.data);
      setLogs((prev) => [logEvent, ...prev].slice(0, 1000));

      if (callback) {
        try {
          await callback(logEvent);
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
  }, [projectId, callback]); // Added callback to dependencies

  return logs;
}
