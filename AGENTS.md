# Правила проекта для ИИ-агентов

Все правила проекта лежат в `CLAUDE.md`: где что лежит, безопасность, тексты, проверки, критерии готовности. Они действуют для любого агента, не только для Claude Code. Перед работой прочитайте `CLAUDE.md`, затем `STATUS.md` (где мы и следующий шаг). Требования конкурса в `TASK.md`, решения и их причины в `PLAN.md` и `docs/ai-log.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
