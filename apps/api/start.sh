#!/bin/sh
set -e

echo "🔄 Waiting for PostgreSQL to be ready..."
# Extract host and port from DB_DSN
DB_HOST=$(echo $DB_DSN | sed -n 's/.*@\([^:]*\).*/\1/p')
MAX_RETRIES=30
RETRY_COUNT=0

# Wait for PostgreSQL to be ready
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if pg_isready -h postgres -U ${POSTGRES_USER:-postgres}; then
    echo "✅ PostgreSQL is ready!"
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT+1))
  echo "PostgreSQL is unavailable - sleeping 2s (attempt $RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
  
  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ Failed to connect to PostgreSQL after $MAX_RETRIES attempts"
    exit 1
  fi
done

echo "🔄 Running database migrations..."
# Run migrations using the atlas CLI
atlas migrate apply --url "$DB_DSN" 

# Check if migrations were successful
if [ $? -eq 0 ]; then
  echo "✅ Migrations completed successfully"
  
  echo "🚀 Starting API server..."
  # Start the API server
  exec /app/api
else
  echo "❌ Migrations failed"
  exit 1
fi 