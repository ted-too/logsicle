# Build stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Copy go.mod and go.sum first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the application
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o bin/api ./cmd/api

# Run stage
FROM alpine:latest

# Install necessary packages
RUN apk --no-cache add ca-certificates curl bash postgresql-client

# Install Atlas CLI
RUN curl -sSf https://atlasgo.sh | bash

WORKDIR /app

# Copy the binary from the builder stage
COPY --from=builder /app/bin/api .
COPY --from=builder /app/internal/storage/migrations ./migrations

# Make the startup script executable
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose the port
EXPOSE 3005

# Change the entrypoint to use our startup script
ENTRYPOINT ["/app/start.sh"]