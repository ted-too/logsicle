import type { LogLevel, RequestLevel } from "@repo/api";
import { cn } from "../utils";

export function getLevelColor(
  value: RequestLevel | LogLevel
): Record<"text" | "bg" | "border", string> {
  switch (value) {
    case "success":
      return {
        text: "text-muted",
        bg: "bg-muted",
        border: "border-muted",
      };
    case "warning":
      return {
        text: "text-warning",
        bg: "bg-warning",
        border: "border-warning",
      };
    case "error":
      return {
        text: "text-error",
        bg: "bg-error",
        border: "border-error",
      };
    case "debug":
      return {
        text: "text-debug",
        bg: "bg-debug",
        border: "border-debug",
      };
    case "fatal":
      return {
        text: "text-fatal",
        bg: "bg-fatal",
        border: "border-fatal",
      };
    default:
      return {
        text: "text-info",
        bg: "bg-info",
        border: "border-info",
      };
  }
}

export function getLevelRowClassName(value: RequestLevel | LogLevel): string {
  switch (value) {
    case "success":
      return "";
    case "warning":
      return cn(
        "bg-warning/5 hover:bg-warning/10 data-[state=selected]:bg-warning/20 focus-visible:bg-warning/10",
        "dark:bg-warning/10 dark:hover:bg-warning/20 dark:data-[state=selected]:bg-warning/30 dark:focus-visible:bg-warning/20"
      );
    case "error":
      return cn(
        "bg-error/5 hover:bg-error/10 data-[state=selected]:bg-error/20 focus-visible:bg-error/10",
        "dark:bg-error/10 dark:hover:bg-error/20 dark:data-[state=selected]:bg-error/30 dark:focus-visible:bg-error/20"
      );
    case "debug":
      return cn(
        "bg-debug/5 hover:bg-debug/10 data-[state=selected]:bg-debug/20 focus-visible:bg-debug/10",
        "dark:bg-debug/10 dark:hover:bg-debug/20 dark:data-[state=selected]:bg-debug/30 dark:focus-visible:bg-debug/20"
      );
    case "info":
      return cn(
        "bg-info/5 hover:bg-info/10 data-[state=selected]:bg-info/20 focus-visible:bg-info/10",
        "dark:bg-info/10 dark:hover:bg-info/20 dark:data-[state=selected]:bg-info/30 dark:focus-visible:bg-info/20"
      );
    case "fatal":
      return cn(
        "bg-fatal/25 hover:bg-fatal/30 data-[state=selected]:bg-fatal/50 focus-visible:bg-fatal/30",
        "dark:bg-fatal/30 dark:hover:bg-fatal/40 dark:data-[state=selected]:bg-fatal/50 dark:focus-visible:bg-fatal/40"
      );
    default:
      return "";
  }
}

export function getRequestLevelLabel(value: RequestLevel): string {
  switch (value) {
    case "success":
      return "2xx";
    case "warning":
      return "4xx";
    case "error":
      return "5xx";
    default:
      return "Unknown";
  }
}
