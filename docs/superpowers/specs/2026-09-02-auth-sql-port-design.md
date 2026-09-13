# Auth-эндпоинты на SQL рядом с Mongo-реализацией

Дата: 2026-09-02
Ветка: `5_1` (fast-forward до `4_4`, далее свои коммиты)

## Постановка

`5_1` приведена к состоянию `4_4` (полный рабочий стек на MongoDB). Поверх этого
auth-флоу дополнительно реализован на PostgreSQL **новыми файлами рядом со
старыми**, чтобы можно было сравнить два подхода к слою данных.

**Эндпоинты не менялись.** Никаких `/sql/...` роутов нет: `/auth/*`,
`/security/devices`, `/users`, `/testing/all-data` остались как были — меняется
только хранилище за ними.

## Принятые решения

| Решение | Выбор |
|---|---|
| Доступ к SQL | Сырой SQL через `node-postgres` (`pg`), без ORM |
| База | Neon (`DATABASE_URL` из `.env`) + идемпотентный `init.sql` |
| Первичный ключ `users` | `bigserial` (драйвер отдаёт `int8` строкой) |
| `device_sessions.device_id` | `uuid` PRIMARY KEY — генерируется в use case, живёт в refresh-токене |
| Сосуществование | Один контроллер, две реализации репозиториев за общим контрактом |
| Переключение | `USER_ACCOUNTS_DB=mongo\|sql` (по умолчанию `sql`) |
| Объём на SQL | Весь `AuthController` + `/security/devices` + `/users` |

`/users` попал в объём вынужденно: держать регистрацию в Postgres, а список
юзеров в Mongo нельзя — это одни и те же люди.

## Как устроено сосуществование

Контракты (абстрактные классы, они же DI-токены):

```
infrastructure/users.repository.abstract.ts
infrastructure/security-devices.repository.abstract.ts
infrastructure/query/users.query-repository.abstract.ts
infrastructure/query/security-devices.query-repository.abstract.ts
domain/entity.contracts.ts          UserEntity, DeviceSessionEntity
```

Реализации:

| Слой | Mongo | SQL |
|---|---|---|
| Сущность user | `domain/user.entity.ts` | `domain/sql/user.sql-entity.ts` |
| Сущность сессии | `domain/device-session.entity.ts` | `domain/sql/device-session.sql-entity.ts` |
| Репозиторий user | `infrastructure/users.mongo-repository.ts` | `infrastructure/sql/users.sql-repository.ts` |
| Репозиторий сессий | `infrastructure/security-devices.mongo-repository.ts` | `infrastructure/sql/security-devices.sql-repository.ts` |
| Read-модель users | `infrastructure/query/users.mongo-query-repository.ts` | `infrastructure/sql/query/users.sql-query-repository.ts` |
| Read-модель сессий | `infrastructure/query/security-devices.mongo-query-repository.ts` | `infrastructure/sql/query/security-devices.sql-query-repository.ts` |

Выбор реализации — один блок `persistenceProviders` в `user-accounts.module.ts`.

## Что смена БД стоила на самом деле

Не изменились вообще: все guards и passport-стратегии, `AuthService`,
`AuthTokensService`, `CryptoService`, `UserEmailNotifier`, `AuthController`,
`SecurityDevicesController`, 12 из 18 use case'ов, `AuthQueryRepository`,
`UsersExternalQueryRepository`.

Изменились только там, где Mongoose протекал наружу:

1. `create-user.usecase.ts` — вместо `@InjectModel` + `UserModel.createInstance()`
   зовёт `usersRepository.createInstance()`; распознаёт оба кода ошибки
   уникальности (`11000` у Mongo, `23505` у Postgres).
2. `login-user.usecase.ts` — то же для `DeviceSession`.
3. `create-confirmed-user` / `update-user` / `delete-user` / `register-user` —
   `Types.ObjectId` заменён на `string`.
4. `users.controller.ts` — `ObjectIdValidationPipe` заменён на `IdValidationPipe`
   (принимает и ObjectId, и положительное целое, потому что контроллер общий).
5. Глобальный `ObjectIdValidationTransformationPipe` убран из `pipes.setup.ts`.

## Различия хранилищ, которые пришлось закрыть явно

- **TTL-индекс.** В Mongo протухшие сессии удалял `expireAfterSeconds: 0`.
  В Postgres автоудаления нет — `security-devices.sql-query-repository`
  фильтрует `WHERE expiration_date > now()`.
- **Типы колонок vs произвольный ввод.** `confirmation_code`/`recovery_code` —
  `uuid`, `users.id` — `bigint`, `device_id` — `uuid`. Нечисловая строка или
  не-uuid роняют запрос в `22P02` (→ 500). Формат проверяется до обращения к БД,
  «неверный формат» трактуется как «не найдено». В Mongo проблемы не было:
  коды хранились строками.
- **ORDER BY не параметризуется.** `sortBy`/`sortDirection` проходят через белый
  список (`sql/query/users-sort-columns.ts`). В Mongo sort принимает объект,
  и значение не может вытечь в текст запроса.
- **Порядок сортировки строк.** `COLLATE "C"` для текстовых колонок даёт
  побайтовый порядок, как в Mongo (без него Postgres сортирует по локали).
  К `timestamptz` collation неприменима, поэтому подставляется только для
  `login`/`email`.
- **Уникальность при soft delete.** Частичные уникальные индексы
  `WHERE deleted_at IS NULL` — прямой аналог `partialFilterExpression`.
- **totalCount.** `COUNT(*) OVER()` в том же запросе вместо отдельного
  `countDocuments`.

## Состояние

- `yarn build` — зелёный.
- `yarn db:init` — идемпотентен, применяется повторно без ошибок.
- e2e (`auth`, `users`, `security-devices`, `refresh-token`, `token-expiration`,
  `rate-limit`): **59/59 в обоих режимах** — `USER_ACCOUNTS_DB=sql` и `=mongo`.

## Временно отключено

`BloggersPlatformModule` закомментирован в `app.module.ts` — `/blogs`, `/posts`,
`/comments` не поднимаются. Код модуля не тронут, переводиться на SQL будет
вручную. Их e2e-спеки исключены через `testPathIgnorePatterns` в
`test/jest-e2e.json` (там же исключён изначально сломанный `app.e2e-spec.ts`).

В `test/rate-limit.e2e-spec.ts` проверка «вне auth-флоу троттлинга нет»
переведена с `/blogs` на `/users` — вернуть обратно, когда модуль включат.
