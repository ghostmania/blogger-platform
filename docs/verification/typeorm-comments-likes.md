# Проверка: TypeORM comments/likes, TTL 5m, IP restriction off

Дата: 2026-11-10. Ветка `6_3`.

## RED / GREEN

- Тикет 01: новая suite `typeorm-comments-likes` на стандартном шве
  (`initSettings` + временный PostgreSQL) написана и прогнана против raw SQL —
  зелёная; две самодельные спеки и их скрипт удалены. Первый прогон упал на
  `ECONNREFUSED`: два supertest-запроса создавались заранее в одном цикле,
  а слушатель закрывается после первого ответа — запросы создаются по одному.
- Тикет 02 (комментарии) и 03 (реакции): та же suite проходит без изменения
  сценариев после замены реализации; добавлена проверка маппинга сущностей на
  существующие таблицы.
- Тикет 04: сценарии реакций постов и последних лайков сняты с `it.skip`
  и упали на заглушках (`Expected: 4, Received: 0`), после реализации —
  зелёные; в `typeorm-blogs-posts` ожидания заглушек заменены нулями.

## Команды и результат

```bash
npx tsc --noEmit -p tsconfig.json   # без ошибок
yarn build                          # OK
bash test/run-postgres-tests.sh     # временный PostgreSQL
```

E2E: **10 suites, 112 passed, 0 skipped — PASS** (73.9 s). Suite
`typeorm-comments-likes` — 18 тестов. Рабочая БД (Neon) не использовалась.

Первая попытка полного прогона упала на `initdb: No space left on device`:
скрипт оставлял каталоги кластеров в `/tmp` после каждого запуска. Теперь
`cleanup` удаляет каталог кластера.

## Настройки

`ACCESS_TOKEN_TTL=5m`, `IP_RESTRICTION_ENABLED=false` проверены в дефолтах
кода, `.env`, `.env.example` и production-переменных Vercel
(`vercel env pull`), изменений не потребовалось.

Не проверялось: внешняя автопроверка инкубатора, деплой, SMTP.
