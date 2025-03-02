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

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy the binary from the builder stage
COPY --from=builder /app/bin/api .

# Expose the port
EXPOSE 3005

# Run the application
CMD ["./api"]