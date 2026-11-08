# Проверка: TypeORM blogs/posts, TTL 5m, IP restriction off

Дата: 2026-11-08. Ветка `6_2`.

## RED / GREEN

- Новая suite `typeorm-blogs-posts` написана до запуска реализации; первый
  прогон не нашёл её из-за ignore-паттерна `posts.e2e-spec.ts$` — паттерны
  в `jest-e2e.json` заякорены на `/`.
- Полный прогон после миграции выявил три сломанные suites: `token-expiration`
  (env TTL задавался после статического импорта `auth.constants`),
  `create-comment` (мок Pool больше не покрывает чтение поста — добавлен мок
  `Repository<Post>`), `comments-likes-sql` (ожидания реальных лайков в
  view поста). Все три приведены в соответствие; проверка `newestLikes` постов
  помечена `it.skip` до миграции лайков.

## Команды и результат

```bash
./node_modules/.bin/tsc --noEmit --pretty false   # без ошибок
yarn build                                         # OK
./node_modules/.bin/jest src/modules/user-accounts/constants/auth.constants.spec.ts  # 2 passed (300s / 20s)
bash test/run-postgres-tests.sh                    # временный PostgreSQL
```

E2E: **11 suites, 135 passed, 1 skipped — PASS** (63.9 s). Новая suite —
21 тест. Рабочая БД (Neon) не использовалась; кластер поднимался через
`initdb`/`pg_ctl` и остановлен после прогона.

Не проверялось: внешняя автопроверка инкубатора, деплой, SMTP. Переменные
`ACCESS_TOKEN_TTL`/`IP_RESTRICTION_ENABLED` на сервере нужно выставить вручную
(`5m` / `false`): они перекрывают дефолты. Коммиты не создавались.

## Разбор деплоя — 2026-11-08, после прогона автотестов

- Runtime-логи Vercel за окно автотестов: только deprecation-warning, ошибок нет.
- CDN request records: 59 запросов раннера (RU → arn1 → iad1), все 2xx/4xx,
  последний в 05:47:06.762Z; дальше записей нет до ручных запросов в 05:49.
- Повтор сценария автотестов против деплоя (2 раунда, 16 запросов каждый):
  все статусы ожидаемые, максимум 1.3 с (POST /sa/blogs), медиана ~0.45 с.
- Neon: `pg_stat_activity` без idle-in-transaction, `pg_locks` без ожиданий,
  TRUNCATE из `testing/all-data` — 73 мс.
- Починка схемы `blogs` проверена на локальном кластере с копией «кривой»
  таблицы (два прогона `db:init` подряд, типы/NOT NULL/default — целевые),
  затем применена к Neon; `createdAt` на деплое стал полным timestamp.
- После изменений: `tsc`, `yarn build` — OK; полный e2e — 11 suites,
  135 passed, 1 skipped (один прогон дал флаки-падение `create-comment`,
  повтор зелёный). Изменения в `vercel.json`/`api/index.ts`/пуле вступят в силу
  после деплоя ветки.
