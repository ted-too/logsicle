#!/bin/bash

# Default values
HOST="api.example.com"
METHOD="GET"
COUNT=1
API_KEY="lsk-v1-neutmuwd4apotut3xgxxkiql4a6asvythvxmver77b22xsjcdfma"
PROJECT_ID="proj_01jq4nmw4af57ayjaqrrtsbh4d"
API_URL="http://localhost:3005"
MAX_DAYS=0 # Set to 0 to disable

# Help function
function show_help {
    echo "Usage: $0 [OPTIONS]"
    echo "Seed request logs to the logging API"
    echo ""
    echo "Options:"
    echo "  -h, --host          Host name (default: api.example.com)"
    echo "  -m, --method        HTTP method (default: GET)"
    echo "  -n, --count         Number of logs to send (default: 1)"
    echo "  -d, --max-days      Maximum days ago for random timestamps (default: 0, current time)"
    echo "  --help              Show this help message"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
    -h | --host)
        HOST="$2"
        shift 2
        ;;
    -m | --method)
        METHOD="$2"
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
    --help)
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

# Function to generate random HTTP method
function random_method {
    if [ "$METHOD" != "GET" ]; then
        echo "$METHOD"
        return
    fi
    
    local methods=("GET" "POST" "PUT" "DELETE")
    echo "${methods[$RANDOM % ${#methods[@]}]}"
}

# Function to generate random path
function random_path {
    local paths=(
        "/api/v1/users"
        "/api/v1/products"
        "/api/v1/orders"
        "/api/v1/auth/login"
        "/api/v1/profile"
        "/health"
    )
    echo "${paths[$RANDOM % ${#paths[@]}]}"
}

# Function to generate random status code
function random_status_code {
    local status_groups=(
        "success"
        "client_error"
        "server_error"
    )
    
    local group=${status_groups[$RANDOM % ${#status_groups[@]}]}
    
    case $group in
        "success")
            echo $((200 + $RANDOM % 6)) # 200-205
            ;;
        "client_error")
            echo $((400 + $RANDOM % 29)) # 400-429
            ;;
        "server_error")
            echo $((500 + $RANDOM % 5)) # 500-504
            ;;
    esac
}

# Function to generate random duration
function random_duration {
    echo $(($RANDOM % 1000)) # 0-999 ms
}

# Function to generate random request body
function random_request_body {
    local method=$1
    if [ "$method" == "GET" ] || [ "$method" == "DELETE" ]; then
        echo "null"
    else
        local user_id="user_$(($RANDOM % 1000))"
        echo "{\"user_id\":\"$user_id\",\"action\":\"create\"}"
    fi
}

# Function to generate random response body
function random_response_body {
    local status=$1
    if [ $status -ge 200 ] && [ $status -lt 300 ]; then
        echo "{\"success\":true,\"id\":\"$RANDOM\"}"
    elif [ $status -ge 400 ]; then
        echo "{\"success\":false,\"error\":\"Error processing request\"}"
    else
        echo "null"
    fi
}

# Function to generate random headers
function random_headers {
    local contentTypes=("application/json" "text/plain" "application/xml")
    local contentType=${contentTypes[$RANDOM % ${#contentTypes[@]}]}
    
    echo "{\"content-type\":\"$contentType\",\"accept\":\"*/*\"}"
}

# Function to generate random query params
function random_query_params {
    local method=$1
    if [ "$method" == "GET" ]; then
        echo "{\"page\":\"1\",\"limit\":\"20\"}"
    else
        echo "null"
    fi
}

# Function to generate random IP address
function random_ip {
    echo "192.168.$((RANDOM % 256)).$((RANDOM % 256))"
}

# Function to generate random protocol
function random_protocol {
    local protocols=("HTTP/1.1" "HTTP/2")
    echo "${protocols[$RANDOM % ${#protocols[@]}]}"
}

# Function to generate random error message
function random_error {
    local status=$1
    if [ $status -ge 400 ]; then
        local errors=(
            "Connection timed out"
            "Invalid request parameters"
            "Resource not found"
            "Internal server error"
        )
        echo "\"${errors[$RANDOM % ${#errors[@]}]}\""
    else
        echo "null"
    fi
}

# Send logs
for ((i = 1; i <= $COUNT; i++)); do
    echo "Sending log $i of $COUNT..."

    # Generate random values
    METHOD_VALUE=$(random_method)
    PATH_VALUE=$(random_path)
    STATUS_CODE=$(random_status_code)
    DURATION=$(random_duration)
    REQUEST_BODY=$(random_request_body "$METHOD_VALUE")
    RESPONSE_BODY=$(random_response_body $STATUS_CODE)
    HEADERS=$(random_headers)
    QUERY_PARAMS=$(random_query_params "$METHOD_VALUE")
    USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    IP_ADDRESS=$(random_ip)
    PROTOCOL=$(random_protocol)
    ERROR=$(random_error $STATUS_CODE)

    # Generate random timestamp if MAX_DAYS is set
    if [ "$MAX_DAYS" -eq 0 ]; then
        TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    else
        max_seconds=$((MAX_DAYS * 24 * 60 * 60))
        random_seconds=$(( RANDOM % max_seconds ))
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
        \"method\":\"$METHOD_VALUE\",
        \"path\":\"$PATH_VALUE\",
        \"status_code\":$STATUS_CODE,
        \"duration\":$DURATION,
        \"request_body\":$REQUEST_BODY,
        \"response_body\":$RESPONSE_BODY,
        \"headers\":$HEADERS,
        \"query_params\":$QUERY_PARAMS,
        \"user_agent\":\"$USER_AGENT\",
        \"ip_address\":\"$IP_ADDRESS\",
        \"protocol\":\"$PROTOCOL\",
        \"host\":\"$HOST\",
        \"error\":$ERROR
    }"

    echo "Log data: method=$METHOD_VALUE, path=$PATH_VALUE, status=$STATUS_CODE"

    curl --location "$API_URL/v1/ingest/request" \
        --header 'Content-Type: application/json' \
        --header "Authorization: Bearer $API_KEY" \
        --data "$DATA"

    echo ""

    # Small delay between requests
    sleep 0.1
done

echo "Finished sending $COUNT request logs for host $HOST"