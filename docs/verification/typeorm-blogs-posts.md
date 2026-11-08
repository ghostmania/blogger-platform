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
