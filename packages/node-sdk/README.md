# Logsicle SDK

![Version](https://img.shields.io/npm/v/@logsicle/client)
![License](https://img.shields.io/npm/l/@logsicle/client)

The official JavaScript SDK for Logsicle, a comprehensive logging and observability platform. This library supports both Node.js and browser environments with separate entry points.

## Features

- 🌐 **Universal** - Works in both Node.js and browser environments
- 📊 **Structured Logging** - Log structured data for better analysis
- 🔄 **Smart Batching** - Efficiently sends logs in batches to reduce network overhead
- 🧩 **Framework Integrations** - Middleware for popular frameworks (Hono, etc.)
- 🔌 **Multiple Transport Types**:
  - Application logs
  - HTTP request logs
  - Analytics events
  - Console interception

## Installation

Install the SDK using npm, yarn, or pnpm:

```bash
# Using npm
npm install @logsicle/client

# Using yarn
yarn add @logsicle/client

# Using pnpm
pnpm add @logsicle/client
```

## Quick Start

### Node.js Environment

```typescript
// Import from the server entry point for Node.js
import { LogsicleClient } from "@logsicle/client/server";

// Initialize the client
const logsicle = new LogsicleClient({
  apiKey: "your-api-key",
  projectId: "your-project-id",
});

// Log application messages
logsicle.app.info("Hello from Node.js!");

// Log HTTP requests
logsicle.request.logRequest(
  "GET", 
  "/api/users", 
  200, 
  150, // duration in ms
  "127.0.0.1" // IP address
);
```

### Browser Environment

```typescript
// Import from the browser entry point
import { LogsicleClient } from "@logsicle/client/browser";

// Initialize the client
const logsicle = new LogsicleClient({
  apiKey: "your-api-key",
  projectId: "your-project-id",
});

// Log application messages
logsicle.app.info("Hello from browser!");

// Send analytics events
logsicle.event.send("page_view", {
  metadata: {
    path: window.location.pathname,
    referrer: document.referrer,
  }
});
```

## Configuration

The SDK can be configured with various options:

```typescript
const logsicle = new LogsicleClient({
  // Required configuration
  apiKey: "your-api-key",
  projectId: "your-project-id",

  // Optional configuration
  environment: "production", // default: "development"
  serviceName: "api-service",
  version: "1.0.0",
  debug: true, // enables internal logging
  
  // Custom endpoint (optional)
  endpoint: {
    apiUrl: "https://api.your-custom-domain.com",
    v: 1, // API version
  },
  
  // Queue configuration (optional)
  queueOptions: {
    flushIntervalMs: 2000,   // default: 1000ms
    maxRetries: 5,           // default: 3
    maxBatchSize: 100,       // default: 50
  },
  
  // Browser-specific options (optional)
  browserOptions: {
    workerUrl: "/custom-worker-path.js", // default: "/logsicle-worker.js"
  },
});
```

## Logging API

### Application Logs

The SDK provides structured logging with various log levels:

```typescript
// Basic logging (level: info)
logsicle.app.info("User successfully registered");

// With additional context
logsicle.app.info("Payment processed", {
  fields: {
    amount: 99.99,
    currency: "USD",
    paymentMethod: "credit_card",
  },
  caller: "PaymentService",
  function: "processPayment",
});

// Different log levels
logsicle.app.debug("Debug message");
logsicle.app.info("Info message");
logsicle.app.warning("Warning message");
logsicle.app.error("Error message");
logsicle.app.fatal("Fatal message");
```

### Console Interception

You can automatically intercept all console methods to send them to Logsicle:

```typescript
// Start intercepting console methods
logsicle.console.intercept();

// Now these will be sent to Logsicle
console.log("This will be logged to Logsicle");
console.info("Information");
console.warn("Warning");
console.error("Error");
console.debug("Debug info");

// Stop intercepting
logsicle.console.restore();
```

### Events

Track analytics events:

```typescript
// Simple event
logsicle.event.send("page_view", {
  metadata: {
    path: "/products",
    referrer: "https://google.com",
  },
});

// Event with more context
logsicle.event.send("purchase_completed", {
  description: "User completed checkout process",
  tags: ["ecommerce", "checkout", "payment"],
  metadata: {
    orderId: "ord_123456",
    amount: 99.99,
    items: 3,
  },
});
```

### HTTP Request Logging

Log HTTP requests and responses:

```typescript
// Simple request logging
logsicle.request.logRequest(
  "POST",
  "/api/users",
  201,
  78, // duration in ms
  "192.168.1.1" // IP address
);

// Detailed request logging
logsicle.request.log({
  method: "GET",
  path: "/api/products",
  status_code: 200,
  duration: 145,
  ip_address: "192.168.1.1",
  user_agent: "Mozilla/5.0...",
  host: "api.example.com",
  headers: {
    "content-type": "application/json",
    "authorization": "Bearer ***",
  },
  request_body: { page: 1, limit: 10 },
  response_body: { 
    items: [{ id: 1, name: "Product" }],
    total: 50,
  },
});
```

## Framework Integrations

### Hono Integration

For Hono applications, Logsicle provides a middleware that automatically logs all requests:

```typescript
import { Hono } from "hono";
import { LogsicleClient } from "@logsicle/client/server";
import { logsicleMiddleware } from "@logsicle/client/middleware";

const logsicle = new LogsicleClient({
  apiKey: "your-api-key",
  projectId: "your-project-id",
});

const app = new Hono();

// Add the middleware to log all requests
app.use(logsicleMiddleware(logsicle, {
  includeHeaders: true,
  includeRequestBody: true,
  includeResponseBody: true,
  skipPaths: ["/health", "/metrics"],
}));

// The middleware also adds the logsicle client to the context
app.get("/api/users", (c) => {
  const logger = c.get("logsicle");
  logger.app.info("Fetching users");
  
  return c.json({ users: [] });
});

export default app;
```

#### Middleware Options

The Hono middleware accepts the following options:

```typescript
interface LogsicleMiddlewareOptions {
  // Paths to exclude from logging
  skipPaths?: string[];
  
  // Custom function to extract IP address
  getIpAddress?: (c: Context) => string;
  
  // Include request headers in logs
  includeHeaders?: boolean;
  
  // Include request body in logs
  includeRequestBody?: boolean;
  
  // Include response body in logs
  includeResponseBody?: boolean;
  
  // Key to set client instance on context
  contextKey?: string;
  
  // Enable debug mode
  debug?: boolean;
}
```

## Browser Support

The SDK is designed to work in both Node.js and browser environments. In browsers, it uses:

- Efficient batching to reduce network requests
- Automatic fallback to standard fetch() when needed

To use in a browser, import from the browser entry point:

```html
<script type="module">
  import { LogsicleClient } from "@logsicle/client/browser";
  
  const logsicle = new LogsicleClient({
    apiKey: "your-api-key",
    projectId: "your-project-id",
  });
  
  logsicle.app.info("Hello from the browser!");
</script>
```

## Best Practices

### Log Sensitive Data

Be careful not to log sensitive data like passwords, tokens, or personal information:

```typescript
// DON'T do this
logsicle.app.info("User logged in", {
  fields: {
    email: "user@example.com",
    password: "secret123", // Never log passwords!
  },
});

// DO this instead
logsicle.app.info("User logged in", {
  fields: {
    email: "user@example.com",
    // No sensitive data
  },
});
```

### Set Appropriate Log Levels

Use the right log level for each message:

- `debug`: Detailed information for debugging
- `info`: Normal application behavior
- `warning`: Something unexpected but not an error
- `error`: Error conditions that should be addressed
- `fatal`: Severe errors that might cause application failure

### Include Context

Add relevant context to log messages:

```typescript
logsicle.app.error("Database connection failed", {
  fields: {
    dbHost: "db.example.com",
    errorCode: "ECONNREFUSED",
    retryCount: 3,
  },
  caller: "DatabaseService",
  function: "connect",
});
```

## License

MIT
