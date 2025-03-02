#!/bin/bash

# Default values
PARALLEL_COUNT=4  # Number of parallel processes

# Help function
function show_help {
    echo "Usage: $0 -p PARALLEL_COUNT SCRIPT [SCRIPT_ARGS...]"
    echo
    echo "Options:"
    echo "  -p, --parallel COUNT    Number of parallel processes to run (default: 4)"
    echo "  -h, --help             Show this help message"
    echo
    echo "Example:"
    echo "  $0 -p 4 ./seed-app-logs.sh -n 100 -d 3"
    echo "  This will run 4 parallel instances of seed-app-logs.sh with the given arguments"
}

# Parse parallel count argument first
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--parallel)
            PARALLEL_COUNT="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            break
            ;;
    esac
done

# Check if there are remaining arguments (script and its args)
if [ $# -eq 0 ]; then
    echo "Error: No script specified"
    show_help
    exit 1
fi

# The remaining arguments are the script and its parameters
SCRIPT_TO_RUN="$1"
shift
SCRIPT_ARGS="$@"

# Validate script exists and is executable
if [ ! -x "$SCRIPT_TO_RUN" ]; then
    echo "Error: Script '$SCRIPT_TO_RUN' not found or not executable"
    exit 1
fi

echo "Starting $PARALLEL_COUNT parallel processes"
echo "Script to run: $SCRIPT_TO_RUN"
echo "Script arguments: $SCRIPT_ARGS"
echo

# Run processes in parallel
for ((i=1; i<=PARALLEL_COUNT; i++)); do
    echo "Starting process $i..."
    $SCRIPT_TO_RUN $SCRIPT_ARGS &
done

# Wait for all background processes to complete
wait

echo "All processes completed!"