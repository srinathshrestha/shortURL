# LinkVerse — Convenience commands
# Load .env for DB_USER, DB_NAME (defaults from .env.example)
-include .env
DB_USER ?= linkverse
DB_NAME ?= linkverse

# Start all services (build if needed)
up:
	docker compose up -d --build

# Stop all services
down:
	docker compose down

# Follow logs
logs:
	docker compose logs -f

# Restart all services
restart:
	docker compose restart

# PostgreSQL shell
shell-db:
	docker compose exec postgres psql -U $(DB_USER) -d $(DB_NAME)

# Apply full schema (one-shot, for fresh DB)
migrate:
	docker compose exec postgres psql -U $(DB_USER) -d $(DB_NAME) -f /migrations/schema.sql

# Seed test data (run after migrate)
seed:
	docker compose exec -T postgres psql -U $(DB_USER) -d $(DB_NAME) < database/seed.sql
