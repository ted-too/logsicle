#!/bin/bash

# Default values
ENVIRONMENT="development"
SERVICE="test-service"
COUNT=1
API_KEY="lsk-v1-neutmuwd4apotut3xgxxkiql4a6asvythvxmver77b22xsjcdfma"
PROJECT_ID="proj_01jq4nmw4af57ayjaqrrtsbh4d"
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
    local request_id=$(LC_ALL=C tr -dc 'a-z0-9' </dev/urandom | head -c 8)
    local duration_ms=$((RANDOM % 1000))

    echo "{\"user_id\":\"$user_id\",\"request_id\":\"req_$request_id\",\"duration_ms\":$duration_ms}"
}

# Function to generate random version
function random_version {
    echo "1.0.$((RANDOM % 10))"
}

# Function to generate random pod ID for host
function random_pod_id {
    echo "${SERVICE}-pod-$(LC_ALL=C tr -dc 'a-z0-9' </dev/urandom | head -c 6)"
}

# Function to generate random caller line
function random_caller {
    local line=$((RANDOM % 500))
    echo "${SERVICE}.go:${line}"
}

# Function to generate random function name
function random_function {
    echo "Process${SERVICE#*-}"
}

# Send logs
for ((i = 1; i <= $COUNT; i++)); do
    echo "Sending log $i of $COUNT..."

    # Generate random timestamp if MAX_DAYS is set
    if [ "$MAX_DAYS" -eq 0 ]; then
        TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    else
        max_seconds=$((MAX_DAYS * 24 * 60 * 60))
        random_seconds=$(( (RANDOM * RANDOM) % max_seconds ))
        current_timestamp=$(date +%s)
        past_timestamp=$((current_timestamp - random_seconds))

        if [[ "$OSTYPE" == "darwin"* ]]; then
            TIMESTAMP=$(date -r $past_timestamp -u +"%Y-%m-%dT%H:%M:%SZ")
        else
            TIMESTAMP=$(date -u -d "@$past_timestamp" +"%Y-%m-%dT%H:%M:%SZ")
        fi
    fi

    DATA="{
        \"project_id\":\"$PROJECT_ID\",
        \"level\":\"$(random_level)\",
        \"message\":\"$(random_message)\",
        \"fields\":$(random_fields),
        \"caller\":\"$(random_caller)\",
        \"function\":\"$(random_function)\",
        \"service_name\":\"$SERVICE\",
        \"version\":\"$(random_version)\",
        \"environment\":\"$ENVIRONMENT\",
        \"host\":\"$(random_pod_id)\",
        \"timestamp\":\"$TIMESTAMP\"
    }"

    echo "Log timestamp: $TIMESTAMP"

    curl --location "$API_URL/v1/ingest/app" \
        --header 'Content-Type: application/json' \
        --header "Authorization: Bearer $API_KEY" \
        --data "$DATA"

    echo -e "\n"

    # Optional: Add a small delay between requests
    # sleep 0.2
done

echo "Finished sending $COUNT logs for service $SERVICE in $ENVIRONMENT environment"