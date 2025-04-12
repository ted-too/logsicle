/**
 * Web Worker script for processing log queues in the browser environment
 * This will be built and served as a separate file that can be loaded by the BrowserWorkerQueue
 */

import { BaseQueueWorker, type WorkerMessage } from "@/shared/base-worker";

export class BrowserQueueWorker extends BaseQueueWorker {
	protected setupMessageHandler(): void {
		self.addEventListener("message", (event: MessageEvent<WorkerMessage>) => {
			this.handleMessage(event.data);
		});
	}

	protected sendMessage(type: string, payload?: any) {
		self.postMessage({ type, payload });
	}

	protected async generatePayloadHash(payload: any): Promise<string> {
		// Convert payload to string if it's not already
		const payloadStr =
			typeof payload === "string" ? payload : JSON.stringify(payload);
		// Convert string to Uint8Array
		const msgUint8 = new TextEncoder().encode(payloadStr);
		// Hash the message
		const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
		// Convert buffer to byte array
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		// Convert bytes to hex string
		const hashHex = hashArray
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
		return hashHex;
	}
}

// Initialize the worker
new BrowserQueueWorker();
