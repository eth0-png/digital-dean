# Цифровой деканат (концепт)

Прототип личного кабинета студента для конкурса MGIMO AI Challenge, номинация «Вайб-кодинг».

**Это концепт, а не официальный сервис МГИМО. Все данные вымышлены.** Логотип МГИМО не используется.

- Задание конкурса: [TASK.md](TASK.md)
- Что узнали из опроса студентов: [research/survey-summary.md](research/survey-summary.md)
- План, идея и этапы: [PLAN.md](PLAN.md)
- Журнал работы с ИИ: [docs/ai-log.md](docs/ai-log.md)
- Правила для ИИ-ассистента: [CLAUDE.md](CLAUDE.md)

## Стек

Next.js 16 (App Router, TypeScript, Tailwind CSS), PostgreSQL. Выкладка: Docker Compose на виртуальной машине Cloud.ru, HTTPS через Caddy.

## Локальный запуск

Нужны Node.js 24+ и Docker.

```bash
npm install
cp .env.example .env   # раскомментировать DATABASE_URL, задать SEED_PASSWORD_*
npm run db             # PostgreSQL в Docker
npm run dev
```

Тестовые аккаунты `student1`, `student2` (студенты) и `dekanat` (сотрудник) создаются при старте с паролями из `.env`.

Проверка перед коммитом: `npm run check` (линтер, типы, сборка).

## Выкладка на сервер

На машине с Docker и Git:

```bash
git clone https://github.com/eth0-png/digital-dean.git && cd digital-dean
cp .env.example .env   # заполнить DOMAIN, POSTGRES_PASSWORD, SEED_PASSWORD_*
docker compose up -d --build
```

Обновление: `git pull && docker compose up -d --build`. После правки `Caddyfile` ещё `docker compose up -d --force-recreate caddy`.
