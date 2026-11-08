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

Операции комментариев и лайков на этом этапе не переносятся и работают через
прежние raw SQL репозитории. Во view-модели поста `extendedLikesInfo` заполняется
заглушками ради контракта: `likesCount: 0`, `dislikesCount: 0`, `myStatus: 'None'`,
`newestLikes: []` — даже если в `post_likes` есть реакции. Реальные значения
вернутся вместе с миграцией лайков на TypeORM.

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
