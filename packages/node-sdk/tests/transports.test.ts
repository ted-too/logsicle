import { expect, describe, test, vi, beforeEach, afterEach } from 'vitest';
import { AppConsoleTransport } from '../src/transports/app-console';
import { AppStructuredLogTransport } from '../src/transports/app-structured';
import { EventTransport } from '../src/transports/event';
import { NodeLogsicleClient } from '../src/server';

// Mock the NodeLogsicleClient to avoid actual network connections
vi.mock('../src/server', () => {
  return {
    NodeLogsicleClient: vi.fn().mockImplementation((config) => {
      return {
        getConfig: () => config,
        enqueue: vi.fn(),
        flush: vi.fn().mockResolvedValue(undefined),
        shutdown: vi.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

describe('Logsicle SDK - Transports', () => {
  describe('AppStructuredLogTransport', () => {
    let client: any;
    let transport: AppStructuredLogTransport;
    
    beforeEach(() => {
      client = new NodeLogsicleClient({
        apiKey: 'test-api-key',
        projectId: 'test-project',
        serviceName: 'default-service',
      });
      transport = new AppStructuredLogTransport(client);
    });
    
    test('should use default service name if not provided', async () => {
      await transport.info('Test message', {});
      
      expect(client.enqueue).toHaveBeenCalledTimes(1);
      const call = client.enqueue.mock.calls[0][0];
      expect(call.payload.service_name).toBe('default-service');
    });
    
    test('should override default service name if provided', async () => {
      await transport.info('Test message', { service_name: 'custom-service' });
      
      expect(client.enqueue).toHaveBeenCalledTimes(1);
      const call = client.enqueue.mock.calls[0][0];
      expect(call.payload.service_name).toBe('custom-service');
    });
    
    test('should set correct log level via convenience methods', async () => {
      await transport.debug('Debug message', {});
      await transport.info('Info message', {});
      await transport.warning('Warning message', {});
      await transport.error('Error message', {});
      await transport.fatal('Fatal message', {});
      
      expect(client.enqueue).toHaveBeenCalledTimes(5);
      expect(client.enqueue.mock.calls[0][0].payload.level).toBe('debug');
      expect(client.enqueue.mock.calls[1][0].payload.level).toBe('info');
      expect(client.enqueue.mock.calls[2][0].payload.level).toBe('warning');
      expect(client.enqueue.mock.calls[3][0].payload.level).toBe('error');
      expect(client.enqueue.mock.calls[4][0].payload.level).toBe('fatal');
    });
    
    test('should include message in payload', async () => {
      await transport.info('Test message', {});
      
      expect(client.enqueue).toHaveBeenCalledTimes(1);
      const call = client.enqueue.mock.calls[0][0];
      expect(call.payload.message).toBe('Test message');
    });
    
    test('should include additional fields if provided', async () => {
      await transport.info('Test message', { 
        fields: { userId: '123', action: 'test' } 
      });
      
      expect(client.enqueue).toHaveBeenCalledTimes(1);
      const call = client.enqueue.mock.calls[0][0];
      expect(call.payload.fields).toEqual({ userId: '123', action: 'test' });
    });
    
    test('should include project_id in payload', async () => {
      await transport.info('Test message', {});
      
      expect(client.enqueue).toHaveBeenCalledTimes(1);
      const call = client.enqueue.mock.calls[0][0];
      expect(call.payload.project_id).toBe('test-project');
    });
    
    test('should generate ISO timestamp', async () => {
      await transport.info('Test message', {});
      
      expect(client.enqueue).toHaveBeenCalledTimes(1);
      const call = client.enqueue.mock.calls[0][0];
      expect(call.payload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
    
    test('should use provided timestamp', async () => {
      const timestamp = '2023-05-01T12:00:00.000Z';
      await transport.info('Test message', { timestamp });
      
      expect(client.enqueue).toHaveBeenCalledTimes(1);
      const call = client.enqueue.mock.calls[0][0];
      expect(call.payload.timestamp).toBe(timestamp);
    });
  });
  
  describe('EventTransport', () => {
    let client: any;
    let transport: EventTransport;
    
    beforeEach(() => {
      client = new NodeLogsicleClient({
        apiKey: 'test-api-key',
        projectId: 'test-project',
      });
      transport = new EventTransport(client);
    });
    
    test('should include event name in payload', async () => {
      await transport.send('test_event', {});
      
      expect(client.enqueue).toHaveBeenCalledTimes(1);
      const call = client.enqueue.mock.calls[0][0];
      expect(call.payload.name).toBe('test_event');
    });
    
    test('should include metadata if provided', async () => {
      await transport.send('test_event', {
        metadata: { feature: 'login', status: 'success' }
      });
      
      expect(client.enqueue).toHaveBeenCalledTimes(1);
      const call = client.enqueue.mock.calls[0][0];
      expect(call.payload.metadata).toEqual({ feature: 'login', status: 'success' });
    });
    
    test('should include project_id in payload', async () => {
      await transport.send('test_event', {});
      
      expect(client.enqueue).toHaveBeenCalledTimes(1);
      const call = client.enqueue.mock.calls[0][0];
      expect(call.payload.project_id).toBe('test-project');
    });
    
    test('should generate ISO timestamp', async () => {
      await transport.send('test_event', {});
      
      expect(client.enqueue).toHaveBeenCalledTimes(1);
      const call = client.enqueue.mock.calls[0][0];
      expect(call.payload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
    
    test('should use provided timestamp', async () => {
      const timestamp = '2023-05-01T12:00:00.000Z';
      await transport.send('test_event', { timestamp });
      
      expect(client.enqueue).toHaveBeenCalledTimes(1);
      const call = client.enqueue.mock.calls[0][0];
      expect(call.payload.timestamp).toBe(timestamp);
    });
  });
  
  describe('AppConsoleTransport', () => {
    let client: any;
    let appTransport: AppStructuredLogTransport;
    let transport: AppConsoleTransport;
    let originalConsole: typeof console;
    
    beforeEach(() => {
      originalConsole = { ...console };
      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'info').mockImplementation(() => {});
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(console, 'trace').mockImplementation(() => {});
      
      client = new NodeLogsicleClient({
        apiKey: 'test-api-key',
        projectId: 'test-project',
      });
      
      appTransport = new AppStructuredLogTransport(client);
      vi.spyOn(appTransport, 'log').mockResolvedValue(undefined);
      
      transport = new AppConsoleTransport(appTransport);
    });
    
    afterEach(() => {
      transport.restore();
      console.log = originalConsole.log;
      console.info = originalConsole.info;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.trace = originalConsole.trace;
    });
    
    test('should intercept console methods when intercept is called', () => {
      transport.intercept();
      
      console.log('Test log');
      console.info('Test info');
      console.warn('Test warning');
      console.error('Test error');
      console.trace('Test trace');
      
      expect(appTransport.log).toHaveBeenCalledTimes(5);
      expect(appTransport.log).toHaveBeenNthCalledWith(1, 'Test log', { level: 'info' });
      expect(appTransport.log).toHaveBeenNthCalledWith(2, 'Test info', { level: 'info' });
      expect(appTransport.log).toHaveBeenNthCalledWith(3, 'Test warning', { level: 'warning' });
      expect(appTransport.log).toHaveBeenNthCalledWith(4, 'Test error', { level: 'error' });
      expect(appTransport.log).toHaveBeenNthCalledWith(5, 'Test trace', { level: 'trace' });
    });
    
    test('should not intercept if already intercepting', () => {
      transport.intercept();
      const interceptedLog = console.log;
      
      transport.intercept(); // Second call should do nothing
      
      expect(console.log).toBe(interceptedLog);
    });
    
    test('should restore original console methods when restore is called', () => {
      transport.intercept();
      transport.restore();
      
      console.log('Test log after restore');
      
      expect(appTransport.log).not.toHaveBeenCalledWith('Test log after restore', expect.anything());
    });
    
    test('should not restore if not intercepting', () => {
      // Store reference to console.log before spying
      const consoleLogBeforeSpy = console.log;
      
      transport.restore(); // Should do nothing
      
      // Make sure the console.log is still the mock version
      expect(console.log).toBe(consoleLogBeforeSpy);
    });
    
    test('should stringify object arguments', () => {
      transport.intercept();
      
      const testObj = { test: 'value' };
      console.log(testObj);
      
      expect(appTransport.log).toHaveBeenCalledWith(JSON.stringify(testObj), { level: 'info' });
    });
    
    test('should join multiple arguments with spaces', () => {
      transport.intercept();
      
      console.log('Test', 123, true);
      
      expect(appTransport.log).toHaveBeenCalledWith('Test 123 true', { level: 'info' });
    });
  });
}); 