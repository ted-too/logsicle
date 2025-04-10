Using Logsicle Client in a Browser Environment
Here's a comprehensive example of how to use the Logsicle client in a browser environment:

Basic Usage

```typescript
// Import the browser-specific client
import { LogsicleClient } from "@logsicle/client/browser";

// Initialize the client
const logsicle = new LogsicleClient({
  apiKey: "lsk-v1-lnptybb7kmbcgydafr7mo4ebeuc2krfkr36cql3x4traf5tz2mfa",
  projectId: "proj_01jm05y003fy2vyqe34tmkdfgk",
  environment: "production",
  serviceName: "web-app",
  // Browser-specific options
  browserOptions: {
    useBeacon: true, // Use Navigator.sendBeacon for page unload events
  },
});

// Log a simple message
logsicle.app.info("Page loaded");

// Log with additional fields
logsicle.app.info("User interaction", {
  fields: {
    userId: "user_123",
    action: "button_click",
    component: "signup_form",
  },
});

// Log different levels
logsicle.app.debug("Detailed debug information");
logsicle.app.warning("Something might be wrong");
logsicle.app.error("An error occurred", {
  fields: {
    errorCode: "AUTH_FAILED",
    attemptCount: 3,
  },
});

// Send a custom event
logsicle.event.send("purchase_completed", {
  channelName: "ecommerce",
  tags: ["successful", "credit-card"],
  metadata: {
    orderId: "order_456",
    amount: 99.99,
    currency: "USD",
    items: 3,
  },
});
```

Intercepting Console Logs

```typescript
import { LogsicleClient } from "@logsicle/client/browser";

const logsicle = new LogsicleClient({
  apiKey: "lsk-v1-lnptybb7kmbcgydafr7mo4ebeuc2krfkr36cql3x4traf5tz2mfa",
  projectId: "proj_01jm05y003fy2vyqe34tmkdfgk",
});

// Start intercepting console logs
logsicle.console.intercept();

// These will now be sent to your logging platform
console.log("This is a log message");
console.info("This is an info message");
console.warn("This is a warning message");
console.error("This is an error message");

// Stop intercepting when needed
logsicle.console.restore();
```

Integration with React

```tsx
import React, { useEffect } from "react";
import { LogsicleClient } from "@logsicle/client/browser";

// Create a singleton instance
const logsicle = new LogsicleClient({
  apiKey: "lsk-v1-lnptybb7kmbcgydafr7mo4ebeuc2krfkr36cql3x4traf5tz2mfa",
  projectId: "proj_01jm05y003fy2vyqe34tmkdfgk",
  environment: process.env.NODE_ENV,
  serviceName: "react-app",
});

// Create a React context for the logger
const LogsicleContext = React.createContext(logsicle);

// Provider component
export const LogsicleProvider = ({ children }) => {
  useEffect(() => {
    // Log application startup
    logsicle.app.info("Application started", {
      fields: {
        url: window.location.href,
        userAgent: navigator.userAgent,
      },
    });

    // Cleanup on unmount
    return () => {
      logsicle.flush();
    };
  }, []);

  return (
    <LogsicleContext.Provider value={logsicle}>
      {children}
    </LogsicleContext.Provider>
  );
};

// Custom hook to use the logger
export const useLogsicle = () => React.useContext(LogsicleContext);

// Example usage in a component
const LoginForm = () => {
  const logsicle = useLogsicle();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    logsicle.app.info("Login attempt", {
      fields: { username },
    });

    try {
      await loginUser(username, password);
      logsicle.app.info("Login successful", {
        fields: { username },
      });
      logsicle.event.send("user_logged_in", {
        channelName: "auth",
        metadata: { username },
      });
    } catch (error) {
      logsicle.app.error("Login failed", {
        fields: {
          username,
          errorMessage: error.message,
        },
      });
    }
  };

  return <form onSubmit={handleSubmit}>{/* Form fields */}</form>;
};
```

Error Tracking

```typescript
import { LogsicleClient } from "@logsicle/client/browser";

const logsicle = new LogsicleClient({
  apiKey: "lsk-v1-lnptybb7kmbcgydafr7mo4ebeuc2krfkr36cql3x4traf5tz2mfa",
  projectId: "proj_01jm05y003fy2vyqe34tmkdfgk",
});

// Set up global error handler
window.addEventListener("error", (event) => {
  logsicle.app.error("Uncaught error", {
    fields: {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
    },
  });
});

// Set up unhandled promise rejection handler
window.addEventListener("unhandledrejection", (event) => {
  logsicle.app.error("Unhandled promise rejection", {
    fields: {
      reason: String(event.reason),
      stack: event.reason?.stack,
    },
  });
});
```

Performance Monitoring

```typescript
import { LogsicleClient } from "@logsicle/client/browser";

const logsicle = new LogsicleClient({
  apiKey: "lsk-v1-lnptybb7kmbcgydafr7mo4ebeuc2krfkr36cql3x4traf5tz2mfa",
  projectId: "proj_01jm05y003fy2vyqe34tmkdfgk",
});

// Log performance metrics when page finishes loading
window.addEventListener("load", () => {
  // Wait for all resources to finish loading
  setTimeout(() => {
    const performance = window.performance;

    if (performance) {
      // Get performance metrics
      const navigationTiming = performance.getEntriesByType("navigation")[0];
      const paintTiming = performance.getEntriesByType("paint");

      // Log page load performance
      logsicle.app.info("Page load performance", {
        fields: {
          domComplete: navigationTiming.domComplete,
          domInteractive: navigationTiming.domInteractive,
          loadEventEnd: navigationTiming.loadEventEnd,
          responseEnd: navigationTiming.responseEnd,
          firstPaint: paintTiming.find((p) => p.name === "first-paint")
            ?.startTime,
          firstContentfulPaint: paintTiming.find(
            (p) => p.name === "first-contentful-paint"
          )?.startTime,
        },
      });
    }
  }, 0);
});
```

SPA Route Change Tracking

```typescript
import { LogsicleClient } from '@logsicle/client/browser';

const logsicle = new LogsicleClient({
  apiKey: 'lsk-v1-lnptybb7kmbcgydafr7mo4ebeuc2krfkr36cql3x4traf5tz2mfa',
  projectId: 'proj_01jm05y003fy2vyqe34tmkdfgk'
});

// For React Router
const trackRouteChange = (location) => {
  logsicle.app.info('Page view', {
    fields: {
      path: location.pathname,
      search: location.search,
      hash: location.hash,
      referrer: document.referrer
    }
  });
};

// Example with React Router
import { useLocation, useEffect } from 'react-router-dom';

function App() {
  const location = useLocation();

  useEffect(() => {
    trackRouteChange(location);
  }, [location]);

  return (
    // Your app components
  );
}
```

User Session Tracking

```typescript
import { LogsicleClient } from "@logsicle/client/browser";

const logsicle = new LogsicleClient({
  apiKey: "lsk-v1-lnptybb7kmbcgydafr7mo4ebeuc2krfkr36cql3x4traf5tz2mfa",
  projectId: "proj_01jm05y003fy2vyqe34tmkdfgk",
});

// Generate a session ID
const generateSessionId = () => {
  return "sess_" + Math.random().toString(36).substring(2, 15);
};

// Get or create session ID
const getSessionId = () => {
  let sessionId = sessionStorage.getItem("logsicle_session_id");
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem("logsicle_session_id", sessionId);

    // Log session start
    logsicle.event.send("session_started", {
      channelName: "sessions",
      metadata: {
        sessionId,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
      },
    });
  }
  return sessionId;
};

// Add session ID to all logs
const sessionId = getSessionId();
const originalSendToApi = logsicle.sendToApi;

logsicle.sendToApi = (endpoint, data) => {
  // Add session ID to app logs
  if (endpoint === "/v1/ingest/app" && data.fields) {
    data.fields.sessionId = sessionId;
  }

  // Add session ID to events
  if (endpoint === "/v1/ingest/event" && data.metadata) {
    data.metadata.sessionId = sessionId;
  }

  return originalSendToApi.call(logsicle, endpoint, data);
};

// Track session end
window.addEventListener("beforeunload", () => {
  logsicle.event.send("session_ended", {
    channelName: "sessions",
    metadata: {
      sessionId,
      duration: (Date.now() - performance.timing.navigationStart) / 1000,
    },
  });
});
```

Manual Flush

```typescript
import { LogsicleClient } from "@logsicle/client/browser";

const logsicle = new LogsicleClient({
  apiKey: "lsk-v1-lnptybb7kmbcgydafr7mo4ebeuc2krfkr36cql3x4traf5tz2mfa",
  projectId: "proj_01jm05y003fy2vyqe34tmkdfgk",
});

// Log some events
logsicle.app.info("User action");
logsicle.app.info("Another action");

// Force flush logs immediately
document.getElementById("logout-button").addEventListener("click", async () => {
  // Log the action
  logsicle.app.info("User logged out");

  // Ensure all logs are sent before redirecting
  await logsicle.flush();

  // Now safe to redirect
  window.location.href = "/login";
});
```

## Web Worker Configuration

For optimal performance in browser environments, Logsicle uses Web Workers to handle log processing in a separate thread. This prevents logging operations from blocking the main thread and impacting your application's performance.

### Basic Setup

By default, Logsicle will look for the worker script at `/logsicle-worker.js`. The worker script is included in the package and should be copied to your public directory.

```typescript
import { LogsicleClient } from "@logsicle/client/browser";
import { copyFileSync } from "fs";
import { join } from "path";

// In your build script, copy the worker file to your public directory
copyFileSync(
  require.resolve("@logsicle/client/dist/logsicle-worker.js"),
  join(process.cwd(), "public", "logsicle-worker.js")
);

// Then initialize the client normally
const logsicle = new LogsicleClient({
  apiKey: "your-api-key",
  projectId: "your-project-id",
});
```

### Custom Worker URL

If you need to place the worker script in a different location, you can specify the URL:

```typescript
const logsicle = new LogsicleClient({
  apiKey: "your-api-key",
  projectId: "your-project-id",
  queueOptions: {
    workerUrl: "/assets/js/logsicle-worker.js",
  },
});
```

### Next.js Integration

For Next.js applications, place the worker in the `public` directory:

```typescript
// In your build script or next.config.js
const { copyFileSync } = require("fs");
const { join } = require("path");

copyFileSync(
  require.resolve("@logsicle/client/dist/logsicle-worker.js"),
  join(process.cwd(), "public", "logsicle-worker.js")
);
```

### Vite/React Integration

For Vite applications, place the worker in the `public` directory:

```typescript
// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync } from "fs";
import { join } from "path";

// Copy worker file to public directory
copyFileSync(
  require.resolve("@logsicle/client/dist/logsicle-worker.js"),
  join(process.cwd(), "public", "logsicle-worker.js")
);

export default defineConfig({
  plugins: [react()],
});
```

These examples demonstrate how to use the Logsicle client in various browser scenarios, from basic logging to advanced integrations with frameworks like React, error tracking, performance monitoring, and session management.
