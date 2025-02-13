#!/bin/bash

# Default values
ENVIRONMENT="development"
SERVICE="test-service"
COUNT=1
API_KEY="lsk-v1-x6ai4arma2iargqrkwx37ai3z3ux75uvterxgwl62fe3ltg7qapq"
PROJECT_ID="proj_01jkqwv3nffrrag6ecgxspx6kq"
API_URL="http://localhost:3005"
MAX_DAYS=0 # Set to 0 to disable

# Help function
function show_help {
    echo "Usage: $0 [OPTIONS]"
    echo "Seed app logs to the logging API"
    echo ""
    echo "Options:"
    echo "  -e, --environment    Environment name (default: development)"
    echo "  -s, --service        Service name (default: test-service)"
    echo "  -n, --count          Number of logs to send (default: 1)"
    echo "  -h, --help           Show this help message"
    echo "  -d, --max-days       Maximum days ago for random timestamps (default: 0, current time)"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
    -e | --environment)
        ENVIRONMENT="$2"
        shift 2
        ;;
    -s | --service)
        SERVICE="$2"
        shift 2
        ;;
    -n | --count)
        COUNT="$2"
        shift 2
        ;;
    -d | --max-days)
        MAX_DAYS="$2"
        shift 2
        ;;
    -h | --help)
        show_help
        exit 0
        ;;
    *)
        echo "Unknown option: $1"
        show_help
        exit 1
        ;;
    esac
done

# Function to generate random level
function random_level {
    local levels=("debug" "info" "warning" "error" "fatal")
    echo "${levels[$RANDOM % ${#levels[@]}]}"
}

# Function to generate random message
function random_message {
    local messages=(
        "Request processed successfully"
        "Failed to connect to database"
        "Cache miss occurred"
        "User authentication successful"
        "Payment processing initiated"
        "Service health check completed"
        "Data synchronization started"
        "Memory usage threshold reached"
        "API rate limit exceeded"
        "Background job completed"
    )
    echo "${messages[$RANDOM % ${#messages[@]}]}"
}

# Function to generate random fields
function random_fields {
    local user_ids=("usr_123" "usr_456" "usr_789" "usr_abc" "usr_def")
    local user_id=${user_ids[$RANDOM % ${#user_ids[@]}]}

    # Generate random timestamp
    if [ "$MAX_DAYS" -eq 0 ]; then
        local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    else
        # Generate random number of seconds ago (up to MAX_DAYS days ago)
        local max_seconds=$((MAX_DAYS * 24 * 60 * 60))
        # Combine multiple RANDOM calls for better distribution
        local random_seconds=$(( (RANDOM * RANDOM) % max_seconds ))
        local current_timestamp=$(date +%s)
        local past_timestamp=$((current_timestamp - random_seconds))

        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS version
            local timestamp=$(date -r $past_timestamp -u +"%Y-%m-%dT%H:%M:%SZ")
        else
            # Linux version
            local timestamp=$(date -u -d "@$past_timestamp" +"%Y-%m-%dT%H:%M:%SZ")
        fi
    fi

    local request_id=$(LC_ALL=C tr -dc 'a-z0-9' </dev/urandom | head -c 8)

    echo "{\"user_id\":\"$user_id\",\"timestamp\":\"$timestamp\",\"request_id\":\"req_$request_id\",\"duration_ms\":$((RANDOM % 1000))}"
}

# Function to generate random pod ID
function random_pod_id {
    LC_ALL=C tr -dc 'a-z0-9' </dev/urandom | head -c 6
}

# Send logs
for ((i = 1; i <= $COUNT; i++)); do
    echo "Sending log $i of $COUNT..."

    LEVEL=$(random_level)
    MESSAGE=$(random_message)
    FIELDS=$(random_fields)
    POD_ID=$(random_pod_id)
    CALLER_LINE=$((RANDOM % 500))
    VERSION_PATCH=$((RANDOM % 10))

    # Extract timestamp from FIELDS for use in main payload
    TIMESTAMP=$(echo $FIELDS | grep -o '"timestamp":"[^"]*"' | cut -d'"' -f4)
    
    # Remove timestamp from FIELDS
    FIELDS=$(echo $FIELDS | jq 'del(.timestamp)')

    DATA="{
        \"project_id\":\"$PROJECT_ID\",
        \"level\":\"$LEVEL\",
        \"message\":\"$MESSAGE\",
        \"service_name\":\"$SERVICE\",
        \"fields\":$FIELDS,
        \"caller\":\"${SERVICE}.go:${CALLER_LINE}\",
        \"function\":\"Process${SERVICE#*-}\",
        \"version\":\"1.0.${VERSION_PATCH}\",
        \"environment\":\"$ENVIRONMENT\",
        \"host\":\"${SERVICE}-pod-${POD_ID}\",
        \"timestamp\":\"$TIMESTAMP\"
    }"

    echo "Log timestamp: $TIMESTAMP"

    curl --location "$API_URL/api/v1/ingest/app" \
        --header 'Content-Type: application/json' \
        --header "Authorization: Bearer $API_KEY" \
        --data "$DATA"

    echo -e "\n"

    # Optional: Add a small delay between requests
    # sleep 0.2
done

echo "Finished sending $COUNT logs for service $SERVICE in $ENVIRONMENT environment"
