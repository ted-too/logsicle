#!/bin/sh
set -e

# Wait for the database to be ready
echo "Waiting for database to be ready..."
MAX_RETRIES=30
RETRY_INTERVAL=2

for i in $(seq 1 $MAX_RETRIES); do
  # Use Atlas's built-in connection testing instead of pg_isready
  if atlas migrate status --env local > /dev/null 2>&1; then
    echo "Database is ready!"
    break
  fi
  
  echo "Waiting for database connection... (Attempt $i/$MAX_RETRIES)"
  sleep $RETRY_INTERVAL
  
  if [ $i -eq $MAX_RETRIES ]; then
    echo "Database connection timeout after $MAX_RETRIES attempts"
    exit 1
  fi
done

# Run migrations
echo "Running database migrations..."
atlas migrate apply --env local

echo "Migrations completed successfully"
exit 0