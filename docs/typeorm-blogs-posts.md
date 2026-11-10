# TypeORM: блоги и посты (public + super admin API)

Третий этап миграции. URL и HTTP-контракты не менялись; предыдущие этапы —
[пользователи](typeorm-users.md) и [auth, устройства, IP restrictions](typeorm-auth-devices.md).

## Что изменено

- `Blog` и `Post` — TypeORM Entity поверх существующих таблиц `blogs` и `posts`
  из `init.sql` (bigint id строкой, `snake_case` колонки, `ManyToOne` на блог с
  `onDelete: CASCADE`). Структуру таблиц TypeORM не трогает: `synchronize: false`.
- Чтение и запись переведены с raw SQL на четыре репозитория:
  `BlogsTypeOrmRepository`, `BlogsTypeOrmQueryRepository`,
  `PostsTypeOrmRepository`, `PostsTypeOrmQueryRepository`. Списки строятся
  QueryBuilder'ом: поиск по имени `ILIKE`, белый список колонок сортировки,
  `COLLATE "C"` для текстовых колонок (побайтовый порядок), вторичная сортировка
  по `id`, `getManyAndCount` для пагинации.
- Super admin API постов (`/sa/blogs/:blogId/posts`) переведён с отдельного
  SQL-сервиса на CQRS use case'ы `CreatePostForBlog`, `UpdatePostForBlog`,
  `DeletePostForBlog`. Пост ищется строго внутри блога из URL: чужой пост — 404.
- При переименовании блога денормализованный `blogName` обновляется у его постов.
- Нечисловые id и значения за пределами int8 отсекаются до обращения к БД
  (`core/database/bigint-id.ts`) и дают 404, а не 500. Исправлена сортировка
  блогов по `websiteUrl`/`isMembership`: раньше запрос падал на camelCase-колонке.

## Комментарии и лайки

На этом этапе операции комментариев и лайков оставались на raw SQL, а
`extendedLikesInfo` во view поста заполнялся заглушками. Это устранено на
[следующем этапе](typeorm-comments-likes.md): комментарии и реакции переведены
на TypeORM, view поста отдаёт реальные значения.

## Настройки

```dotenv
ACCESS_TOKEN_TTL=5m
REFRESH_TOKEN_TTL=20s
IP_RESTRICTION_ENABLED=false
```

Access-токен живёт не меньше 5 минут (дефолт `5m`). IP restriction по умолчанию
**выключен** и включается только явным `IP_RESTRICTION_ENABLED=true`. Переменные
окружения сервера имеют приоритет над дефолтами — на деплое их надо привести к
этим значениям. Новых таблиц нет, `yarn db:init` повторять не требуется.

## Проверки

```bash
yarn build
yarn test:e2e:local
```

Новая suite `test/typeorm-blogs-posts.e2e-spec.ts`: basic auth на `/sa/*`,
CRUD блогов и постов, валидация в формате `errorsMessages`, каскадное удаление
постов, поиск/сортировка/пагинация, заглушки лайков, невалидные id,
совместимость с существующими SQL-строками и большими id, `testing/all-data`.
Короткие TTL для `token-expiration` задаёт `test/helpers/short-token-ttl.ts`,
а не скрипт запуска.

## Деплой (Vercel + Neon), разбор падения автотестов 2026-11-08

Автотесты инкубатора падали с `request timeout of 6000ms exceeded` подряд на
десятке тестов. По CDN-записям Vercel (`vercel logs requests`) запросы раннера
(RU, axios) просто перестали доходить до edge после 05:47:06 UTC — ни одной
записи (в т.ч. 504) до следующих ручных запросов. Ошибок приложения в runtime-логах
нет; повтор того же сценария против деплоя укладывается в 0.3–1.3 с на запрос.
Вывод: сбой на пути раннер → Vercel, не в приложении. Что сделано на нашей стороне:

- `vercel.json`: регион функции `fra1` — рядом с Neon (eu-central-1) и раннером;
  раньше функция жила в `iad1`, и каждый запрос к БД ходил через Атлантику.
- `api/index.ts`: упавший bootstrap больше не залипает в кеше инстанса.
- Общие `poolOptions` (connection/idle/query timeout, `max: 5`) для pg Pool и
  TypeORM: мёртвое после заморозки соединение к Neon даёт ошибку, а не зависание.
- Таблица `blogs` на Neon была создана вручную до `init.sql` (text/date, без
  NOT NULL), из-за чего `createdAt` блогов отдавался полуночью. В `init.sql`
  добавлен идемпотентный блок починки; `yarn db:init` применён к Neon.
