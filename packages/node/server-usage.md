Using Logsicle Client in a Node.js Server Environment

Here are comprehensive examples of how to use the Logsicle client in various Node.js server environments:

Basic Express Server Example

```typescript
// Import the Node.js-specific client
import {
  LogsicleClient,
  installExpressShutdownHandler,
} from "@logsicle/client/node";
import express from "express";

// Initialize the client
const logsicle = new LogsicleClient({
  apiKey: "lsk-v1-lnptybb7kmbcgydafr7mo4ebeuc2krfkr36cql3x4traf5tz2mfa",
  projectId: "proj_01jm05y003fy2vyqe34tmkdfgk",
  environment: process.env.NODE_ENV || "development",
  serviceName: "api-server",
  version: "1.0.0",
});

// Create Express app
const app = express();

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  // Log request start
  logsicle.app.info(`Request started: ${req.method} ${req.path}`, {
    fields: {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    },
  });

  // Capture response
  const originalEnd = res.end;
  res.end = function (...args) {
    const responseTime = Date.now() - startTime;

    // Log request completion
    logsicle.app.info(`Request completed: ${req.method} ${req.path}`, {
      fields: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime,
        contentLength: res.get("Content-Length"),
      },
    });

    originalEnd.apply(res, args);
  };

  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  logsicle.app.error(`Error processing request: ${req.method} ${req.path}`, {
    fields: {
      method: req.method,
      path: req.path,
      error: err.message,
      stack: err.stack,
      statusCode: err.statusCode || 500,
    },
  });

  res.status(err.statusCode || 500).json({
    error: err.message || "Internal Server Error",
  });
});

// Routes
app.get("/", (req, res) => {
  logsicle.app.debug("Processing root request");
  res.send("Hello World");
});

app.post("/users", async (req, res) => {
  try {
    logsicle.app.info("Creating new user", {
      fields: {
        userData: req.body,
      },
    });

    // Create user logic here
    const user = { id: 123, name: req.body.name };

    // Log custom event
    logsicle.event.send("user_created", {
      channelName: "users",
      metadata: {
        userId: user.id,
        userEmail: req.body.email,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    logsicle.app.error("Failed to create user", {
      fields: {
        error: error.message,
        stack: error.stack,
        userData: req.body,
      },
    });

    res.status(400).json({ error: error.message });
  }
});

// Start server
const server = app.listen(3000, () => {
  logsicle.app.info("Server started", {
    fields: {
      port: 3000,
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
    },
  });
});

// Install graceful shutdown handler
installExpressShutdownHandler(server);

// Intercept console logs (optional)
logsicle.console.intercept();
```

NestJS Integration

```typescript
// main.ts
import { NestFactory } from "@nestjs/core";
import { LogsicleClient, shutdownAll } from "@logsicle/client/node";
import { AppModule } from "./app.module";

// Create Logsicle client
const logsicle = new LogsicleClient({
  apiKey: "lsk-v1-lnptybb7kmbcgydafr7mo4ebeuc2krfkr36cql3x4traf5tz2mfa",
  projectId: "proj_01jm05y003fy2vyqe34tmkdfgk",
  environment: process.env.NODE_ENV || "development",
  serviceName: "nestjs-api",
});

// Create a custom logger service
// logger.service.ts
import { Injectable, LoggerService } from "@nestjs/common";

@Injectable()
export class LogsicleLogger implements LoggerService {
  constructor(private logsicle: LogsicleClient) {}

  log(message: any, context?: string) {
    this.logsicle.app.info(message, {
      fields: { context },
    });
  }

  error(message: any, trace?: string, context?: string) {
    this.logsicle.app.error(message, {
      fields: { trace, context },
    });
  }

  warn(message: any, context?: string) {
    this.logsicle.app.warning(message, {
      fields: { context },
    });
  }

  debug(message: any, context?: string) {
    this.logsicle.app.debug(message, {
      fields: { context },
    });
  }

  verbose(message: any, context?: string) {
    this.logsicle.app.debug(message, {
      fields: { context, level: "verbose" },
    });
  }
}

// In main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new LogsicleLogger(logsicle),
  });

  // Add global exception filter
  app.useGlobalFilters(new LogsicleExceptionFilter(logsicle));

  // Add request logging middleware
  app.use((req, res, next) => {
    const startTime = Date.now();

    res.on("finish", () => {
      const responseTime = Date.now() - startTime;

      logsicle.app.info(`${req.method} ${req.originalUrl}`, {
        fields: {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          responseTime,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
        },
      });
    });

    next();
  });

  const server = await app.listen(3000);

  // Handle graceful shutdown
  const shutdown = async () => {
    await app.close();
    await shutdownAll();
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

bootstrap();
```

Fastify Integration

```typescript
import Fastify from "fastify";
import { LogsicleClient, shutdownAll } from "@logsicle/client/node";

// Initialize the client
const logsicle = new LogsicleClient({
  apiKey: "lsk-v1-lnptybb7kmbcgydafr7mo4ebeuc2krfkr36cql3x4traf5tz2mfa",
  projectId: "proj_01jm05y003fy2vyqe34tmkdfgk",
  environment: process.env.NODE_ENV || "development",
  serviceName: "fastify-api",
});

// Create Fastify instance
const fastify = Fastify({
  logger: false, // Disable Fastify's built-in logger
});

// Register Logsicle as a plugin
fastify.register(async (instance) => {
  instance.decorate("logsicle", logsicle);

  // Add hooks for request logging
  instance.addHook("onRequest", (request, reply, done) => {
    request.logsicleStartTime = Date.now();

    logsicle.app.info(`Request started: ${request.method} ${request.url}`, {
      fields: {
        method: request.method,
        url: request.url,
        ip: request.ip,
        headers: request.headers,
      },
    });

    done();
  });

  instance.addHook("onResponse", (request, reply, done) => {
    const responseTime = Date.now() - request.logsicleStartTime;

    logsicle.app.info(`Request completed: ${request.method} ${request.url}`, {
      fields: {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime,
      },
    });

    done();
  });

  // Add error hook
  instance.addHook("onError", (request, reply, error, done) => {
    logsicle.app.error(
      `Error processing request: ${request.method} ${request.url}`,
      {
        fields: {
          method: request.method,
          url: request.url,
          error: error.message,
          stack: error.stack,
        },
      }
    );

    done();
  });
});

// Define routes
fastify.get("/", async (request, reply) => {
  request.server.logsicle.app.debug("Processing root request");
  return { hello: "world" };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    logsicle.app.info("Server started", {
      fields: {
        port: 3000,
        environment: process.env.NODE_ENV || "development",
      },
    });
  } catch (err) {
    logsicle.app.fatal("Failed to start server", {
      fields: {
        error: err.message,
        stack: err.stack,
      },
    });
    process.exit(1);
  }
};

start();

// Handle graceful shutdown
const shutdown = async () => {
  try {
    await fastify.close();
    await shutdownAll();
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
```

Database Operation Tracking

```typescript
import { LogsicleClient } from "@logsicle/client/node";
import { MongoClient } from "mongodb";

const logsicle = new LogsicleClient({
  apiKey: "lsk-v1-lnptybb7kmbcgydafr7mo4ebeuc2krfkr36cql3x4traf5tz2mfa",
  projectId: "proj_01jm05y003fy2vyqe34tmkdfgk",
});

// Connect to MongoDB
async function connectToDatabase() {
  try {
    logsicle.app.info("Connecting to MongoDB");

    const client = new MongoClient("mongodb://localhost:27017");
    await client.connect();

    logsicle.app.info("Connected to MongoDB successfully");

    const db = client.db("myapp");

    // Wrap collection methods to add logging
    const originalCollection = db.collection.bind(db);
    db.collection = function (name) {
      const collection = originalCollection(name);

      // Wrap find method
      const originalFind = collection.find.bind(collection);
      collection.find = function (query) {
        logsicle.app.debug(`MongoDB find operation on ${name}`, {
          fields: {
            collection: name,
            query: JSON.stringify(query),
            operation: "find",
          },
        });

        return originalFind(query);
      };

      // Wrap insertOne method
      const originalInsertOne = collection.insertOne.bind(collection);
      collection.insertOne = async function (doc) {
        const startTime = Date.now();

        try {
          const result = await originalInsertOne(doc);

          logsicle.app.info(
            `MongoDB insertOne operation on ${name} succeeded`,
            {
              fields: {
                collection: name,
                operation: "insertOne",
                duration: Date.now() - startTime,
                documentId: result.insertedId.toString(),
              },
            }
          );

          return result;
        } catch (error) {
          logsicle.app.error(`MongoDB insertOne operation on ${name} failed`, {
            fields: {
              collection: name,
              operation: "insertOne",
              duration: Date.now() - startTime,
              error: error.message,
              stack: error.stack,
            },
          });

          throw error;
        }
      };

      return collection;
    };

    return db;
  } catch (error) {
    logsicle.app.error("Failed to connect to MongoDB", {
      fields: {
        error: error.message,
        stack: error.stack,
      },
    });

    throw error;
  }
}

// Usage
async function main() {
  const db = await connectToDatabase();

  // These operations will be logged
  const users = db.collection("users");
  await users.insertOne({ name: "John", email: "john@example.com" });
  const user = await users.find({ name: "John" }).toArray();
}

main().catch(console.error);
```

Background Job Processing with Bull

```typescript
import { LogsicleClient } from "@logsicle/client/node";
import Queue from "bull";

const logsicle = new LogsicleClient({
  apiKey: "lsk-v1-lnptybb7kmbcgydafr7mo4ebeuc2krfkr36cql3x4traf5tz2mfa",
  projectId: "proj_01jm05y003fy2vyqe34tmkdfgk",
  serviceName: "worker",
});

// Create a queue
const emailQueue = new Queue("email-sending", "redis://localhost:6379");

// Add logging to queue events
emailQueue.on("error", (error) => {
  logsicle.app.error("Queue error", {
    fields: {
      queue: "email-sending",
      error: error.message,
      stack: error.stack,
    },
  });
});

emailQueue.on("waiting", (jobId) => {
  logsicle.app.debug("Job waiting", {
    fields: {
      queue: "email-sending",
      jobId,
    },
  });
});

emailQueue.on("active", (job) => {
  logsicle.app.info("Job started", {
    fields: {
      queue: "email-sending",
      jobId: job.id,
      data: job.data,
    },
  });
});

emailQueue.on("completed", (job, result) => {
  logsicle.app.info("Job completed", {
    fields: {
      queue: "email-sending",
      jobId: job.id,
      processingTime: job.processedOn - job.timestamp,
      result,
    },
  });

  logsicle.event.send("email_sent", {
    channelName: "emails",
    metadata: {
      recipient: job.data.to,
      template: job.data.template,
      jobId: job.id,
    },
  });
});

emailQueue.on("failed", (job, error) => {
  logsicle.app.error("Job failed", {
    fields: {
      queue: "email-sending",
      jobId: job.id,
      attempts: job.attemptsMade,
      error: error.message,
      stack: error.stack,
      data: job.data,
    },
  });

  logsicle.event.send("email_failed", {
    channelName: "emails",
    metadata: {
      recipient: job.data.to,
      template: job.data.template,
      jobId: job.id,
      error: error.message,
    },
  });
});

// Process jobs
emailQueue.process(async (job) => {
  const { to, subject, template, variables } = job.data;

  logsicle.app.info(`Processing email job for ${to}`, {
    fields: {
      jobId: job.id,
      recipient: to,
      template,
    },
  });

  try {
    // Simulate email sending
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Log progress
    await job.progress(50);
    logsicle.app.debug(`Email job ${job.id} 50% complete`);

    // Simulate more processing
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Return result
    return { sent: true, timestamp: new Date().toISOString() };
  } catch (error) {
    logsicle.app.error(`Error sending email to ${to}`, {
      fields: {
        jobId: job.id,
        error: error.message,
        stack: error.stack,
      },
    });

    throw error;
  }
});

// Add a job to the queue
async function sendWelcomeEmail(user) {
  logsicle.app.info(`Queueing welcome email for ${user.email}`, {
    fields: {
      userId: user.id,
      email: user.email,
    },
  });

  const job = await emailQueue.add({
    to: user.email,
    subject: "Welcome to our platform!",
    template: "welcome-email",
    variables: {
      name: user.name,
      activationLink: `https://example.com/activate?token=${user.activationToken}`,
    },
  });

  logsicle.app.debug(`Welcome email queued with job ID ${job.id}`);

  return job.id;
}

// Example usage
sendWelcomeEmail({
  id: "user_123",
  email: "new.user@example.com",
  name: "New User",
  activationToken: "abc123xyz",
}).catch(console.error);

// Graceful shutdown
process.on("SIGTERM", async () => {
  logsicle.app.info("Worker shutting down");
  await emailQueue.close();
  await logsicle.shutdown();
  process.exit(0);
});
```

GraphQL API with Apollo Server

```typescript
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import express from "express";
import {
  LogsicleClient,
  installExpressShutdownHandler,
} from "@logsicle/client/node";
import { json } from "body-parser";

// Initialize Logsicle
const logsicle = new LogsicleClient({
  apiKey: "lsk-v1-lnptybb7kmbcgydafr7mo4ebeuc2krfkr36cql3x4traf5tz2mfa",
  projectId: "proj_01jm05y003fy2vyqe34tmkdfgk",
  serviceName: "graphql-api",
});

// Define schema
const typeDefs = `
  type Query {
    hello: String
    user(id: ID!): User
  }
  
  type User {
    id: ID!
    name: String!
    email: String!
  }
`;

// Define resolvers
const resolvers = {
  Query: {
    hello: () => {
      logsicle.app.debug("Resolving hello query");
      return "Hello world!";
    },
    user: (_, { id }, context) => {
      logsicle.app.info(`Resolving user query for ID: ${id}`, {
        fields: {
          userId: id,
          requestId: context.requestId,
        },
      });

      // Simulate database lookup
      return {
        id,
        name: "John Doe",
        email: "john@example.com",
      };
    },
  },
};

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    {
      // Plugin for logging requests
      async requestDidStart(requestContext) {
        const requestId = `req_${Math.random().toString(36).substring(2, 12)}`;

        logsicle.app.info("GraphQL request started", {
          fields: {
            requestId,
            operationName: requestContext.request.operationName,
            query: requestContext.request.query,
          },
        });

        const startTime = Date.now();

        return {
          async willSendResponse(responseContext) {
            const duration = Date.now() - startTime;

            logsicle.app.info("GraphQL request completed", {
              fields: {
                requestId,
                operationName: requestContext.request.operationName,
                duration,
                errors: responseContext.errors?.length || 0,
              },
            });
          },

          async didEncounterErrors(errorsContext) {
            logsicle.app.error("GraphQL errors encountered", {
              fields: {
                requestId,
                operationName: requestContext.request.operationName,
                errors: errorsContext.errors.map((err) => ({
                  message: err.message,
                  path: err.path,
                  extensions: err.extensions,
                })),
              },
            });
          },
        };
      },
    },
  ],
});

// Start server
async function startServer() {
  await server.start();

  const app = express();

  app.use(json());

  // Add request logging middleware
  app.use((req, res, next) => {
    const requestId = `req_${Math.random().toString(36).substring(2, 12)}`;
    req.requestId = requestId;

    logsicle.app.info(`HTTP request: ${req.method} ${req.path}`, {
      fields: {
        requestId,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      },
    });

    next();
  });

  // Add Apollo middleware
  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req }) => {
        return {
          requestId: req.requestId,
        };
      },
    })
  );

  const httpServer = app.listen(4000, () => {
    logsicle.app.info("GraphQL server started", {
      fields: {
        port: 4000,
        environment: process.env.NODE_ENV || "development",
      },
    });
  });

  // Install graceful shutdown handler
  installExpressShutdownHandler(httpServer);
}

startServer().catch((error) => {
  logsicle.app.fatal("Failed to start GraphQL server", {
    fields: {
      error: error.message,
      stack: error.stack,
    },
  });

  process.exit(1);
});
```

Microservice with gRPC

```typescript
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { LogsicleClient, shutdownAll } from "@logsicle/client/node";
import path from "path";

// Initialize Logsicle
const logsicle = new LogsicleClient({
  apiKey: "lsk-v1-lnptybb7kmbcgydafr7mo4ebeuc2krfkr36cql3x4traf5tz2mfa",
  projectId: "proj_01jm05y003fy2vyqe34tmkdfgk",
  serviceName: "user-service",
  environment: process.env.NODE_ENV || "development",
});

// Load protobuf
const PROTO_PATH = path.resolve(__dirname, "./protos/user.proto");
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const userProto = grpc.loadPackageDefinition(packageDefinition).user;

// Implement service methods
const users = new Map();

const getUser = (call, callback) => {
  const userId = call.request.id;

  logsicle.app.info(`gRPC GetUser request for ID: ${userId}`, {
    fields: {
      userId,
      peer: call.getPeer(),
    },
  });

  try {
    const user = users.get(userId);

    if (!user) {
      const error = {
        code: grpc.status.NOT_FOUND,
        message: `User not found: ${userId}`,
      };

      logsicle.app.warning(`User not found: ${userId}`, {
        fields: {
          userId,
          errorCode: grpc.status.NOT_FOUND,
        },
      });

      return callback(error);
    }

    logsicle.app.debug(`User found: ${userId}`);
    callback(null, user);
  } catch (error) {
    logsicle.app.error(`Error getting user: ${userId}`, {
      fields: {
        userId,
        error: error.message,
        stack: error.stack,
      },
    });

    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
};

const createUser = (call, callback) => {
  const user = call.request;

  logsicle.app.info(`gRPC CreateUser request`, {
    fields: {
      email: user.email,
      peer: call.getPeer(),
    },
  });

  try {
    // Generate ID
    const userId = `user_${Date.now()}`;
    user.id = userId;

    // Store user
    users.set(userId, user);

    logsicle.app.info(`User created: ${userId}`, {
      fields: {
        userId,
        email: user.email,
      },
    });

    // Send custom event
    logsicle.event.send("user_created", {
      channelName: "users",
      metadata: {
        userId,
        email: user.email,
      },
    });

    callback(null, user);
  } catch (error) {
    logsicle.app.error(`Error creating user`, {
      fields: {
        userData: user,
        error: error.message,
        stack: error.stack,
      },
    });

    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
};

// Create gRPC server
const server = new grpc.Server();

// Add logging interceptor
const loggingInterceptor = (options, nextCall) => {
  const requestId = `req_${Math.random().toString(36).substring(2, 12)}`;

  return new grpc.InterceptingCall(nextCall(options), {
    start: function (metadata, listener, next) {
      const startTime = Date.now();

      // Enhanced listener with logging
      const enhancedListener = {
        onReceiveMetadata: function (metadata, next) {
          logsicle.app.debug(`gRPC metadata received`, {
            fields: {
              requestId,
              metadata: metadata.getMap(),
            },
          });
          next(metadata);
        },
        onReceiveMessage: function (message, next) {
          next(message);
        },
        onReceiveStatus: function (status, next) {
          const duration = Date.now() - startTime;

          if (status.code === grpc.status.OK) {
            logsicle.app.info(`gRPC call completed successfully`, {
              fields: {
                requestId,
                method: options.method_definition.path,
                duration,
                peer: options.channel.getTarget(),
              },
            });
          } else {
            logsicle.app.error(`gRPC call failed`, {
              fields: {
                requestId,
                method: options.method_definition.path,
                duration,
                statusCode: status.code,
                statusDetails: status.details,
                peer: options.channel.getTarget(),
              },
            });
          }

          next(status);
        },
      };

      logsicle.app.info(`gRPC call started`, {
        fields: {
          requestId,
          method: options.method_definition.path,
          peer: options.channel.getTarget(),
        },
      });

      next(metadata, enhancedListener);
    },
    sendMessage: function (message, next) {
      next(message);
    },
  });
};

// Register service with interceptor
server.addService(
  userProto.UserService.service,
  {
    getUser,
    createUser,
  },
  loggingInterceptor
);

// Start server
server.bindAsync(
  "0.0.0.0:50051",
  grpc.ServerCredentials.createInsecure(),
  (error, port) => {
    if (error) {
      logsicle.app.fatal(`Failed to start gRPC server`, {
        fields: {
          error: error.message,
          stack: error.stack,
        },
      });

      process.exit(1);
    }

    server.start();

    logsicle.app.info(`gRPC server started`, {
      fields: {
        port,
        environment: process.env.NODE_ENV || "development",
      },
    });
  }
);

// Handle graceful shutdown
const shutdown = async () => {
  logsicle.app.info("Shutting down gRPC server");

  server.tryShutdown(async () => {
    await shutdownAll();
    process.exit(0);
  });

  // Force shutdown after 5 seconds if graceful shutdown fails
  setTimeout(() => {
    logsicle.app.warning("Forcing shutdown after timeout");
    process.exit(1);
  }, 5000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
```

These examples demonstrate how to use the Logsicle client in various Node.js server environments, from basic Express applications to more complex setups with GraphQL, background job processing, and gRPC microservices. The examples include request logging, error tracking, performance monitoring, and graceful shutdown handling.
