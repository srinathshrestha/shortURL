# LinkVerse Analytics — Cursor Prompts & Diagrams

## How to use this

Every Cursor session starts with `00-MASTER-CONTEXT.md`. Paste it first, then paste the specific prompt for what you're building. Cursor gets full context on every session.

---

## Build Order

Work in this sequence — each step depends on the previous.

| #   | File                                             | What it builds                                                  |
| --- | ------------------------------------------------ | --------------------------------------------------------------- |
| 1   | `cursor-prompts/01-db-schema.md`                 | PostgreSQL schema, migrations, seed data                        |
| 2   | `cursor-prompts/02-docker-nginx.md`              | docker-compose.yml, nginx.conf, .env.example, Makefile          |
| 3   | `cursor-prompts/04-auth-service.md`              | Auth Service (Go) — register, login, JWT                        |
| 4   | `cursor-prompts/03-gateway-service.md`           | API Gateway (Go) — JWT middleware, rate limiter, proxy          |
| 5   | `cursor-prompts/05-link-service.md`              | Link Service (Go) — shorten, redirect, async analytics dispatch |
| 6   | `cursor-prompts/06-analytics-report-services.md` | Analytics + Report services (Python/FastAPI)                    |

---

## Diagrams (paste into Notion, GitHub, or any Mermaid renderer)

| File                                  | Shows                                                |
| ------------------------------------- | ---------------------------------------------------- |
| `diagrams/01-system-architecture.mmd` | All components and connections                       |
| `diagrams/02-db-schema.mmd`           | ERD — tables, columns, relationships                 |
| `diagrams/03-flow-create-link.mmd`    | Sequence: user creates a short link                  |
| `diagrams/04-flow-redirect.mmd`       | Sequence: anonymous click/redirect + async analytics |
| `diagrams/05-docker-network.mmd`      | Docker network, port exposure, volumes               |

To render Mermaid: paste content into https://mermaid.live

---

## Cursor Workflow Tips

1. Open a new Cursor chat for each service
2. Paste `00-MASTER-CONTEXT.md` → then the service prompt
3. Let Cursor generate all files
4. Review each file — check that env var names match `.env.example` exactly
5. Run `docker compose up --build` after each service is added to catch integration issues early
