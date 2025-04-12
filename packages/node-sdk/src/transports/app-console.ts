import type { AppStructuredLogTransport } from "@/transports/app-structured";
import type { LogLevel } from "@/types";

export class AppConsoleTransport {
  protected appStructuredTransport: AppStructuredLogTransport;
  protected originalConsole: typeof console;
  protected isIntercepting = false;

  constructor(appTransport: AppStructuredLogTransport) {
    this.appStructuredTransport = appTransport;
    this.originalConsole = { ...console };
  }

  intercept(): void {
    if (this.isIntercepting) return;

    console.log = this.wrapConsoleMethod("log", "info");
    console.info = this.wrapConsoleMethod("info", "info");
    console.warn = this.wrapConsoleMethod("warn", "warning");
    console.error = this.wrapConsoleMethod("error", "error");
    console.trace = this.wrapConsoleMethod("trace", "trace");
    console.debug = this.wrapConsoleMethod("debug", "debug");

    this.isIntercepting = true;
  }

  restore(): void {
    if (!this.isIntercepting) return;

    console.log = this.originalConsole.log;
    console.info = this.originalConsole.info;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.trace = this.originalConsole.trace;
    console.debug = this.originalConsole.debug;

    this.isIntercepting = false;
  }

  protected wrapConsoleMethod(method: keyof typeof console, level: LogLevel) {
    const original = this.originalConsole[method];
    const appTransport = this.appStructuredTransport;

    return (...args: any[]) => {
      // Call original console method
      // Use Function.prototype.apply.call to avoid the TypeScript error
      Function.prototype.apply.call(original, console, args);

      // Convert arguments to string to check if it's an internal SDK log
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        )
        .join(" ");

      // Skip logging for internal Logsicle messages to avoid recursion
      if (
        message.startsWith("Logsicle:") ||
        message.startsWith("Logsicle ") ||
        message.startsWith("[Logsicle]")
      ) {
        return;
      }

      // Send to logging service
      appTransport.log(message, { level });
    };
  }
}
