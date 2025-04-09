import { AppStructuredLogTransport } from "@/transports/app-structured";
import { LogLevel } from "@/types";

export class AppConsoleTransport {
  protected appStructuredTransport: AppStructuredLogTransport;
  protected originalConsole: typeof console;
  protected isIntercepting: boolean = false;

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

    this.isIntercepting = true;
  }

  restore(): void {
    if (!this.isIntercepting) return;

    console.log = this.originalConsole.log;
    console.info = this.originalConsole.info;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.trace = this.originalConsole.trace;

    this.isIntercepting = false;
  }

  protected wrapConsoleMethod(method: keyof typeof console, level: LogLevel) {
    const original = this.originalConsole[method];
    const appTransport = this.appStructuredTransport;

    return function (...args: any[]) {
      // Call original console method
      // Use Function.prototype.apply.call to avoid the TypeScript error
      Function.prototype.apply.call(original, console, args);

      // Send to logging service
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        )
        .join(" ");

      appTransport.log(message, { level });
    };
  }
}
