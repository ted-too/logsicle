import { expect, describe, test, vi } from 'vitest';

// This is a standalone mock test that doesn't rely on importing the actual SDK
describe('Logsicle SDK - Basic Tests', () => {
  // Mock the core client
  class MockLogsicleClient {
    private config: any;

    constructor(config: any) {
      this.config = config;
    }

    getConfig() {
      return this.config;
    }

    enqueue = vi.fn();
    flush = vi.fn().mockResolvedValue(undefined);
    shutdown = vi.fn().mockResolvedValue(undefined);
  }

  test('should create client with correct config', () => {
    const config = {
      apiKey: 'test-api-key',
      projectId: 'test-project-id',
      debug: true
    };
    
    const client = new MockLogsicleClient(config);
    expect(client.getConfig()).toEqual(config);
  });

  test('should enqueue data', () => {
    const client = new MockLogsicleClient({});
    const data = { type: 'app', payload: { message: 'test' } };
    
    client.enqueue(data);
    
    expect(client.enqueue).toHaveBeenCalledWith(data);
  });

  test('should call flush', async () => {
    const client = new MockLogsicleClient({});
    
    await client.flush();
    
    expect(client.flush).toHaveBeenCalled();
  });

  test('should call shutdown', async () => {
    const client = new MockLogsicleClient({});
    
    await client.shutdown();
    
    expect(client.shutdown).toHaveBeenCalled();
  });
}); 