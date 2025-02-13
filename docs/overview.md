# Logsicle - Modern Logging & Observability Platform

## Overview

Logsicle is a multi-tenant logging and observability platform designed for modern applications. It provides real-time log ingestion, processing, and analysis with support for multiple log types and structured data.

## Core Features

- **Multi-type Logging**

  - Event Logs (business/domain events)
  - Application Logs (debug, info, warning, error)
  - Request Logs (HTTP traffic)
  - Traces (OpenTelemetry)
  - Metrics Collection

- **Real-time Capabilities**

  - Live log streaming
  - Real-time search and filtering
  - Instant notifications

- **Organization**
  - Project-based multi-tenancy
  - Configurable channels per log type
  - Flexible retention policies

## Technical Architecture

### Backend (Go)

- **API Server**: Fiber framework for HTTP handling
- **Queue**: Redis Streams for buffering and processing
- **Storage**:
  - TimescaleDB for time-series data
  - PostgreSQL for user/project management
- **Authentication**: API keys for ingestion, session-based for dashboard

### Data Flow

1. Logs ingested via REST API
2. Buffered in Redis Streams
3. Batch processed to TimescaleDB
4. Real-time updates via SSE

### Key Design Decisions

- Separation of ingestion and processing
- Batch operations for performance
- Channel and Environment based organization
- Structured logging with schema validation

## Project Structure

apps/
├── api/ # Go backend service
└── web/ # Frontend application
packages/
└── api/ # Shared API types and clients

## Development Guidelines

- All logs must be validated against defined schemas
- Use batch operations for database writes
- Follow existing patterns for new log types
- Add tests for critical paths
