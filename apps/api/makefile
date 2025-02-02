# Development variables
BINARY_NAME=logsicle-api
BINARY_DIR=./bin
MAIN_GO=cmd./cmd/api

# Build targets
default: build run

# Development commands
dev:
	@$$(go env GOPATH)/bin/air

# Build commands
build: build-app

build-app:
	@go build -v -o $(BINARY_DIR)/$(BINARY_NAME) $(MAIN_GO)

run:
	$(BINARY_DIR)/$(BINARY_NAME)

# Database commands
rundb:
	docker container inspect timescalepostgresdb >/dev/null 2>&1 && docker start timescalepostgresdb || \
	docker run \
		-e POSTGRES_USER=postgres \
		-e POSTGRES_PASSWORD=postgres \
		-e POSTGRES_DB=logsicle \
		-p 5432:5432 \
		-v timescale_postgres_data:/var/lib/postgresql/data \
		--name timescalepostgresdb \
		-d timescale/timescaledb:latest-pg15

stopdb:
	docker stop timescalepostgresdb

# Migration commands
migrate-up:
	atlas migrate apply --env local

migrate-down:
	atlas migrate down --env local

migrate-hash:
	atlas migrate hash --env local

migrate-diff:
	atlas migrate diff $(filter-out $@,$(MAKECMDGOALS)) --env local

# Special target to catch arguments
%:
	@:

.PHONY: default build dev build-app run \
	rundb stopdb migrate-up migrate-down migrate-force-up \
	migrate-hash migrate-diff