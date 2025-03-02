#!/bin/bash

# Default values
CHANNEL="test_event"
COUNT=1
API_KEY="lsk-v1-o6fknaznawzxxccq6cffjg7nwgcbxe4fit7okwns6q66un4vfmuq"
PROJECT_ID="proj_01jkpctjpbe3bsn3frr5gmgpf3"
API_URL="http://localhost:3005"

# Help function
function show_help {
    echo "Usage: $0 [OPTIONS]"
    echo "Seed events to the logging API"
    echo ""
    echo "Options:"
    echo "  -c, --channel    Channel name (default: test_event)"
    echo "  -n, --count      Number of events to send (default: 1)"
    echo "  -h, --help       Show this help message"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--channel)
            CHANNEL="$2"
            shift 2
            ;;
        -n|--count)
            COUNT="$2"
            shift 2
            ;;
        -h|--help)
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

# Function to generate random metadata
function generate_metadata {
    local idx=$1
    echo "{\"index\": $idx, \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}"
}

# Send events
for ((i=1; i<=$COUNT; i++)); do
    echo "Sending event $i of $COUNT..."
    
    METADATA=$(generate_metadata $i)
    
    curl --location "$API_URL/api/v1/ingest/event" \
        --header 'Content-Type: application/json' \
        --header "Authorization: Bearer $API_KEY" \
        --data "{
            \"project_id\": \"$PROJECT_ID\",
            \"channel\": \"$CHANNEL\",
            \"name\": \"${CHANNEL}_${i}\",
            \"description\": \"Test event $i for channel $CHANNEL\",
            \"metadata\": $METADATA,
            \"tags\": [\"test\", \"seeded\", \"$CHANNEL\"]
        }"
    
    echo -e "\n"
done

echo "Finished sending $COUNT events to channel $CHANNEL"