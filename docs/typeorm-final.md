# TypeORM: завершение миграции DAL и контракт API

Пятый этап миграции. URL и HTTP-контракты эндпоинтов из документации не
менялись; предыдущие этапы — [пользователи](typeorm-users.md),
[auth, устройства, IP restrictions](typeorm-auth-devices.md),
[блоги и посты](typeorm-blogs-posts.md),
[комментарии и реакции](typeorm-comments-likes.md).
Термины — в [GLOSSARY.md](../GLOSSARY.md).

## Что изменено

- База данных только через TypeORM: модуль с отдельным пулом `pg` и токен
  `PG_POOL` удалены; `testing/all-data` выполняет `TRUNCATE ... RESTART
  IDENTITY CASCADE` через `DataSource`, `yarn db:init` применяет `init.sql`
  через `DataSource`. Пакет `pg` остаётся только драйвером TypeORM.
- Публичный API по контракту: удалены контроллер `/users` с use case'ом
  обновления, write-методы публичного `/blogs`, `/app` с `AppService`,
  закомментированные роуты постов, глобальный префикс. Суперадминистратор
  работает только через `/sa/users` и `/sa/blogs`, хелперы тестов переведены
  на `/sa/users`.
- `user-accounts` устроен как `bloggers-platform`: абстрактные классы
  репозиториев и query-репозиториев, интерфейсы `UserEntity` и
  `DeviceSessionEntity` удалены; use case'ы, запросы и guards зависят от
  TypeORM-репозиториев и сущностей напрямую. Хелпер сортировки пользователей
  переехал из `sql/query` в `typeorm/query`.
- Мёртвые спеки Mongo-эпохи (`blogs`, `posts`, `comments`, `app` e2e и
  `app.controller.spec`) удалены, `testPathIgnorePatterns` оставлен только
  для `node_modules`.
- Lint: `eslint.config.mjs` переведён на `typescript-eslint` (flat config,
  `recommendedTypeChecked`), `yarn lint` проходит. В `src` устранены `any`
  в guards, декораторах параметров, фильтрах исключений и настройке
  приложения; для `test/**` и `*.spec.ts` отключены правила `no-unsafe-*`
  (тела ответов supertest типизировать по одному нет смысла).
- Новая e2e-спека `test/api-conformance.e2e-spec.ts` — чек-лист контракта:
  отсутствие роутов вне контракта, basic auth на `/sa/*`, bearer на записях,
  cookie refresh-токена на `/auth/refresh-token`, `/auth/logout` и
  `/security/devices`, формат `errorsMessages` на каждом эндпоинте с телом,
  формы `UserViewModel`/`BlogViewModel`/`PostViewModel`/`CommentViewModel`/
  `DeviceViewModel`, `Paginator` с дефолтами, поиск и сортировка, 403 на
  чужие комментарии и сессии, 404 на несуществующие и некорректные id,
  полный цикл auth и `testing/all-data`.

## Настройки

Схема БД не менялась, `synchronize: false`, `yarn db:init` повторять не нужно.
Дефолты прежние:

```dotenv
ACCESS_TOKEN_TTL=5m
REFRESH_TOKEN_TTL=20s
IP_RESTRICTION_ENABLED=false
```

## Проверки

```bash
yarn lint
yarn build
yarn test:e2e:local
```

Отчёт о прогоне — [verification/typeorm-final.md](verification/typeorm-final.md).
