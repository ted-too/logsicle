/**
 * Worker thread script for processing log queues in the Node.js environment
 */

import { parentPort } from "node:worker_threads";
import { webcrypto } from "node:crypto";
import { BaseQueueWorker, type WorkerMessage } from "@/shared/base-worker";

export class NodeQueueWorker extends BaseQueueWorker {
	protected setupMessageHandler(): void {
		parentPort?.on("message", (message: WorkerMessage) => {
			this.handleMessage(message);
		});
	}

	protected sendMessage(type: string, payload?: any) {
		parentPort?.postMessage({ type, payload });
	}

	protected async generatePayloadHash(payload: any): Promise<string> {
		// Convert payload to string if it's not already
		const payloadStr =
			typeof payload === "string" ? payload : JSON.stringify(payload);
		// Convert string to Uint8Array
		const msgUint8 = new TextEncoder().encode(payloadStr);
		// Hash the message
		const hashBuffer = await webcrypto.subtle.digest("SHA-256", msgUint8);
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
new NodeQueueWorker();
