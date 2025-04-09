# Logsicle Node.js SDK

A powerful logging SDK for Node.js applications that enables seamless log collection, retention, and management.

## Installation

```bash
npm install @logsicle/client
# or
yarn add @logsicle/client
```

## Quick Start

```javascript
// Node.js environment
import { LogsicleClient } from "@logsicle/client/node";

// Browser environment
import { LogsicleClient } from "@logsicle/client/browser";

// Initialize the client
const logsicle = new LogsicleClient({
  apiKey: "your-api-key",
  projectId: "your-project-id",
  environment: process.env.NODE_ENV || "development",
  serviceName: "your-service-name",
});

// Log a message
logsicle.app.info("Application started");

// Log with additional context
logsicle.app.info("User logged in", {
  fields: {
    userId: "user_123",
    email: "user@example.com",
  },
});

// Send a custom event
logsicle.event.send("payment_processed", {
  channelName: "transactions",
  metadata: {
    amount: 99.99,
    currency: "USD",
    customerId: "cust_123",
  },
});
```

## Features

- **Multiple Log Levels**: debug, info, warning, error, fatal
- **Structured Logging**: Add context with structured fields
- **Custom Events**: Track business events separately from application logs
- **Console Interception**: Capture console.log calls automatically
- **Graceful Shutdown**: Ensure logs are sent before application exits
- **Browser Support**: Works in both Node.js and browser environments

## Usage Examples

### Server-Side Usage

For detailed examples of using Logsicle in server environments including:
- Express, NestJS, and Fastify integration
- Database operation tracking
- Background job processing
- GraphQL and gRPC services

See the [Server Usage Guide](./packages/node/server-usage.md)

### Browser Usage

For detailed examples of using Logsicle in browser environments including:
- React integration
- Error tracking
- Performance monitoring
- SPA route change tracking
- User session management

See the [Browser Usage Guide](./packages/node/browser-usage.md)

## API Reference

### LogsicleClient

```typescript
new LogsicleClient({
  apiKey: string;
  projectId: string;
  environment?: string;
  serviceName?: string;
  version?: string;
  browserOptions?: {
    useBeacon?: boolean;
  };
})
```

### Logging Methods

```typescript
logsicle.app.debug(message: string, options?: LogOptions)
logsicle.app.info(message: string, options?: LogOptions)
logsicle.app.warning(message: string, options?: LogOptions)
logsicle.app.error(message: string, options?: LogOptions)
logsicle.app.fatal(message: string, options?: LogOptions)
```

### Event Methods

```typescript
logsicle.event.send(eventName: string, options: EventOptions)
```

### Utility Methods

```typescript
logsicle.console.intercept() // Capture console.log calls
logsicle.console.restore()   // Stop capturing console.log calls
logsicle.flush()             // Force send any buffered logs
logsicle.shutdown()          // Gracefully shut down the client
```

## License

MIT