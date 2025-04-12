// import {
// 	expect,
// 	describe,
// 	test,
// 	vi,
// 	beforeEach,
// 	afterEach,
// 	type Mock,
// } from "vitest";
// import { createLogsicleClient } from "../src/index";
// import { LogsicleClient as NodeClient } from "../src/server-entry";
// import type { BatchResponse, LogsicleConfig, ResourceData } from "../src/types";

// // Mock the fetch any for API calls
// global.fetch = vi.fn();

// // Mock the NodeQueueManager to control its behavior
// vi.mock("../src/server/queue-manager", () => {
// 	// Store original implementation to selectively use parts of it
// 	const actual = vi.importActual("../src/server/queue-manager");

// 	return {
// 		// Use a custom implementation that extends the real one but with mocked parts
// 		NodeQueueManager: vi.fn().mockImplementation((options) => {
// 			// We can selectively mock or use real methods as needed
// 			return {
// 				enqueue: vi.fn(),
// 				flush: vi.fn().mockResolvedValue(undefined),
// 				stop: vi.fn(),
// 				on: vi.fn(),
// 				// Allow accessing queue for tests
// 				queue: [],
// 			};
// 		}),
// 	};
// });

// // Mock os module for hostname tests
// vi.mock("node:os", () => ({
// 	hostname: vi.fn().mockReturnValue("test-server-hostname"),
// }));

// // Force Node environment for tests
// vi.mock("../src/index", () => {
// 	const actual = vi.importActual("../src/index");
// 	return {
// 		...actual,
// 		createLogsicleClient: (config: LogsicleConfig) => {
// 			return new NodeClient(config);
// 		},
// 	};
// });

// describe("Logsicle SDK - Advanced Features", () => {
// 	describe("Client Configuration", () => {
// 		test("should use custom endpoint if provided", () => {
// 			const config: LogsicleConfig = {
// 				apiKey: "test-api-key",
// 				projectId: "test-project",
// 				endpoint: {
// 					apiUrl: "https://custom.api.com",
// 					v: 2,
// 				},
// 			};

// 			const client = createLogsicleClient(config) as NodeClient;

// 			expect(client.getConfig().endpoint?.apiUrl).toBe(
// 				"https://custom.api.com",
// 			);
// 			expect(client.getConfig().endpoint?.v).toBe(2);
// 		});

// 		test("should support custom environment values", () => {
// 			const config: LogsicleConfig = {
// 				apiKey: "test-api-key",
// 				projectId: "test-project",
// 				environment: "staging",
// 			};

// 			const client = createLogsicleClient(config) as NodeClient;

// 			expect(client.getConfig().environment).toBe("staging");

// 			// Test custom environment string
// 			const customEnvClient = createLogsicleClient({
// 				...config,
// 				environment: "custom-env",
// 			}) as NodeClient;

// 			expect(customEnvClient.getConfig().environment).toBe("custom-env");
// 		});

// 		test("should configure queue options", () => {
// 			const config: LogsicleConfig = {
// 				apiKey: "test-api-key",
// 				projectId: "test-project",
// 				queueOptions: {
// 					flushIntervalMs: 5000,
// 					maxRetries: 5,
// 					maxBatchSize: 100,
// 				},
// 			};

// 			const client = createLogsicleClient(config) as NodeClient;

// 			expect(client.getConfig().queueOptions?.flushIntervalMs).toBe(5000);
// 			expect(client.getConfig().queueOptions?.maxRetries).toBe(5);
// 			expect(client.getConfig().queueOptions?.maxBatchSize).toBe(100);
// 		});
// 	});

// 	describe("Error Handling", () => {
// 		let client: NodeClient;

// 		beforeEach(() => {
// 			vi.clearAllMocks();

// 			client = createLogsicleClient({
// 				apiKey: "test-api-key",
// 				projectId: "test-project",
// 				debug: true,
// 			}) as NodeClient;
// 		});

// 		afterEach(async () => {
// 			await client.shutdown();
// 		});

// 		test("should handle network errors gracefully during flush", async () => {
// 			// Setup the mock implementation for this test
// 			const mockQueueManager = (client as any).queueManager;
// 			const errorListener = vi.fn();

// 			// Replace the flush method to simulate a network error
// 			mockQueueManager.flush.mockRejectedValueOnce(new Error("Network error"));

// 			// Register error listener
// 			mockQueueManager.on.mockImplementation((event: string, callback: any) => {
// 				if (event === "error") {
// 					errorListener.mockImplementation(callback);
// 				}
// 			});

// 			// Trigger flush
// 			try {
// 				await client.flush();
// 			} catch (error) {
// 				// Should not throw to the calling code
// 				expect(error).toBeUndefined();
// 			}

// 			// Verify we attempted to flush
// 			expect(mockQueueManager.flush).toHaveBeenCalled();

// 			// Listeners should have been set up, but error handling happens in queue manager
// 			expect(mockQueueManager.on).toHaveBeenCalledWith(
// 				"error",
// 				expect.any(Function),
// 			);
// 		});

// 		test("should handle API errors gracefully", async () => {
// 			// Mock fetch to simulate API error
// 			(global.fetch as Mock).mockResolvedValueOnce({
// 				ok: false,
// 				status: 500,
// 				statusText: "Internal Server Error",
// 				json: async () => ({ error: "Server error" }),
// 			});

// 			// Configure client with mock QueueManager
// 			client = createLogsicleClient({
// 				apiKey: "test-api-key",
// 				projectId: "test-project",
// 				debug: true,
// 			}) as NodeClient;

// 			// Enqueue a log and flush
// 			client.app.info("Test message", { service_name: "test-service" });

// 			try {
// 				await client.flush();
// 				// Should not throw to calling code
// 			} catch (error) {
// 				expect(error).toBeUndefined();
// 			}

// 			// Verify queue manager handled the error
// 			expect((client as any).queueManager.flush).toHaveBeenCalled();
// 		});
// 	});

// 	describe("Batch Processing", () => {
// 		let client: NodeClient;

// 		beforeEach(() => {
// 			vi.clearAllMocks();

// 			// Mock successful batch response
// 			(global.fetch as Mock).mockResolvedValue({
// 				ok: true,
// 				json: async () => ({ processed: 1, failed: [] }),
// 			});

// 			client = createLogsicleClient({
// 				apiKey: "test-api-key",
// 				projectId: "test-project",
// 				queueOptions: {
// 					flushIntervalMs: 5000,
// 					maxBatchSize: 3,
// 				},
// 			}) as NodeClient;
// 		});

// 		afterEach(async () => {
// 			await client.shutdown();
// 		});

// 		test("should respect batch size limits when flushing", async () => {
// 			// Setup a spy to check the sent payloads
// 			const mockQueueManager = (client as any).queueManager;

// 			// Generate 5 log entries (should be split into 2 batches)
// 			for (let i = 0; i < 5; i++) {
// 				client.app.info(`Message ${i}`, { service_name: "test-service" });
// 			}

// 			await client.flush();

// 			// Should have flushed all entries
// 			expect(mockQueueManager.flush).toHaveBeenCalled();
// 		});

// 		test("should handle failed items in batch response", async () => {
// 			// Mock a partial failure response
// 			(global.fetch as Mock).mockResolvedValueOnce({
// 				ok: true,
// 				json: async (): Promise<BatchResponse> => ({
// 					processed: 2,
// 					failed: [
// 						{
// 							input: {
// 								type: "app",
// 								payload: {
// 									message: "Failed message",
// 									level: "error",
// 									service_name: "test-service",
// 									project_id: "test-project",
// 								},
// 							},
// 							code: 400,
// 							message: "Invalid payload",
// 						},
// 					],
// 				}),
// 			});

// 			const mockQueueManager = (client as any).queueManager;
// 			const itemDroppedListener = vi.fn();

// 			// Register listener
// 			mockQueueManager.on.mockImplementation((event: string, callback: any) => {
// 				if (event === "itemDropped") {
// 					itemDroppedListener.mockImplementation(callback);
// 				}
// 			});

// 			// Send logs
// 			client.app.info("Good message 1", { service_name: "test-service" });
// 			client.app.info("Good message 2", { service_name: "test-service" });
// 			client.app.error("Failed message", { service_name: "test-service" });

// 			await client.flush();

// 			// Verify flush was called
// 			expect(mockQueueManager.flush).toHaveBeenCalled();

// 			// Listeners should be set up to handle dropped items
// 			expect(mockQueueManager.on).toHaveBeenCalledWith(
// 				"itemDropped",
// 				expect.any(Function),
// 			);
// 		});
// 	});

// 	describe("Integration Tests", () => {
// 		let client: NodeClient;
// 		let consoleSpy: ReturnType<typeof vi.spyOn>;

// 		beforeEach(() => {
// 			vi.clearAllMocks();

// 			// Mock successful batch response
// 			(global.fetch as Mock).mockResolvedValue({
// 				ok: true,
// 				json: async () => ({ processed: 1, failed: [] }),
// 			});

// 			// Spy on console for debug messages
// 			consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

// 			client = createLogsicleClient({
// 				apiKey: "test-api-key",
// 				projectId: "test-project",
// 				debug: true,
// 			}) as NodeClient;
// 		});

// 		afterEach(async () => {
// 			await client.shutdown();
// 			consoleSpy.mockRestore();
// 		});

// 		test("should log debug messages when debug flag is enabled", async () => {
// 			// Setup the batch processed event
// 			const mockQueueManager = (client as any).queueManager;
// 			let batchProcessedCallback: any;

// 			mockQueueManager.on.mockImplementation((event: string, callback: any) => {
// 				if (event === "batchProcessed") {
// 					batchProcessedCallback = callback;
// 				}
// 			});

// 			// Send a log
// 			client.app.info("Test message", { service_name: "test-service" });

// 			// Simulate batch processed event
// 			batchProcessedCallback?.();

// 			// Should log debug message
// 			expect(consoleSpy).toHaveBeenCalledWith(
// 				expect.stringContaining("batch processed"),
// 			);
// 		});

// 		test("should include hostname in logs automatically", async () => {
// 			// Configure spy to capture the enqueued data
// 			const enqueueSpy = vi.fn();
// 			(client as any).queueManager.enqueue = enqueueSpy;

// 			// Send a log without specifying host
// 			client.app.info("Test message", { service_name: "test-service" });

// 			// Verify host was automatically added
// 			expect(enqueueSpy).toHaveBeenCalledTimes(1);
// 			const payload = enqueueSpy.mock.calls[0][0] as ResourceData;

// 			if (payload.type === "app") {
// 				// Should be the mocked hostname
// 				expect(payload.payload.host).toBe("test-server-hostname");
// 			}
// 		});

// 		test("should intercept and restore console methods", () => {
// 			// Spy on original console methods
// 			const originalLog = console.log;
// 			const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
// 			const appLogSpy = vi
// 				.spyOn(client.app, "log")
// 				.mockResolvedValue(undefined);

// 			// Intercept console
// 			client.console.intercept();

// 			// Log something
// 			console.log("Intercepted log");

// 			// Should use intercepted method
// 			expect(appLogSpy).toHaveBeenCalledWith("Intercepted log", {
// 				level: "info",
// 			});

// 			// Restore console
// 			client.console.restore();

// 			// Log again
// 			console.log("Restored log");

// 			// Should not call app.log after restore
// 			expect(appLogSpy).toHaveBeenCalledTimes(1);

// 			// Cleanup
// 			logSpy.mockRestore();
// 		});

// 		test("should handle multiple types of payloads", async () => {
// 			// Setup enqueue spy
// 			const enqueueSpy = vi.fn();
// 			(client as any).queueManager.enqueue = enqueueSpy;

// 			// Log app message
// 			client.app.info("App log", {
// 				service_name: "test-service",
// 				fields: { userId: "123", action: "login" },
// 			});

// 			// Send event
// 			client.event.send("user.login", {
// 				metadata: { userId: "123", browser: "Chrome" },
// 			});

// 			// Verify both types were enqueued correctly
// 			expect(enqueueSpy).toHaveBeenCalledTimes(2);

// 			const appPayload = enqueueSpy.mock.calls[0][0] as ResourceData;
// 			const eventPayload = enqueueSpy.mock.calls[1][0] as ResourceData;

// 			expect(appPayload.type).toBe("app");
// 			expect(eventPayload.type).toBe("event");

// 			if (appPayload.type === "app") {
// 				expect(appPayload.payload.message).toBe("App log");
// 				expect(appPayload.payload.fields).toEqual({
// 					userId: "123",
// 					action: "login",
// 				});
// 			}

// 			if (eventPayload.type === "event") {
// 				expect(eventPayload.payload.name).toBe("user.login");
// 				expect(eventPayload.payload.metadata).toEqual({
// 					userId: "123",
// 					browser: "Chrome",
// 				});
// 			}
// 		});
// 	});
// });
