# OREA AI

OREA AI is a conversational chatbot that sends messages to OpenAI through a server-side API, keeping the OpenAI key out of browser code.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/orea-ai run dev` — run the OREA AI web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required secret: `OPENAI_API_KEY` — OpenAI API key, used only by the API server
- Optional env: `OPENAI_MODEL` — model name; defaults to `gpt-4o-mini`
- Optional env: `OREA_ALLOWED_ORIGINS` — comma-separated origins for a separate frontend domain

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite

## Where things live

- `artifacts/orea-ai/src/` — OREA AI chat interface
- `artifacts/api-server/src/routes/chat.ts` — server-side OpenAI chat endpoint
- `lib/api-spec/openapi.yaml` — API contract source of truth

## Architecture decisions

- The browser sends conversation messages to `POST /api/chat`; the API server uses the official OpenAI SDK and Responses API, adding the key only to the server-side request.
- The browser keeps the visible conversation in local storage, so no user account or database is needed for the current experience.
- The chat API allows same-host requests and configured `OREA_ALLOWED_ORIGINS` values, and applies an in-memory per-IP request limit.

## Product

OREA AI supports multi-turn conversations, retains the active transcript in the browser across reloads, and returns clear messages for configuration, rate-limit, timeout, and service errors.

## User preferences

The OpenAI API key must remain in Replit Secrets and must never be added to frontend code.

## Gotchas

- Configure a different website domain in `OREA_ALLOWED_ORIGINS` before calling the chat API from that domain.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
