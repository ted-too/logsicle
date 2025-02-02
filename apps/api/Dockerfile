# Build stage
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/api

# Run stage
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/main .
COPY config.yml .
EXPOSE 3000
CMD ["./main"]