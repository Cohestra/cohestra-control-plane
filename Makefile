.PHONY: build test run-api run-worker temporal-up temporal-down

build:
	go build ./...

test:
	go test -race ./...

verify:
	go mod tidy
	go test -race ./...
	go vet ./...
	go build ./...
	docker compose config --quiet

run-api:
	go run ./cmd/control-api

run-worker:
	go run ./cmd/worker

temporal-up:
	docker compose up -d

temporal-down:
	docker compose down
