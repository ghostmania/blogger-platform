# TypeORM: пользователи и первый блок автопроверки

## Что изменено

Пользователи читаются и сохраняются через `UsersTypeOrmRepository` и
`UsersTypeOrmQueryRepository`. `User` — TypeORM Entity с методами изменения
состояния; подтверждение email, восстановление пароля и имя описаны embedded
классами без префиксов колонок. Репозитории внедряются через существующие
абстрактные классы, поэтому auth, CQRS handlers и внешние запросы пользователей
используют одно хранилище.

Сохраняются таблица `users`, bigint ID (строки в JavaScript), имена колонок,
частичные уникальные индексы и мягкое удаление. Остальные репозитории продолжают
работать через `pg` в той же PostgreSQL базе. У TypeORM и raw SQL отдельные пулы
с общей конфигурацией подключения. MongoDB, её реализации и зависимости удалены;
неиспользуемые обработчики старого Mongo DAL удалены вместе с ними.

## Запуск

1. Установить зависимости: `yarn install --frozen-lockfile`.
2. Указать `DATABASE_URL` в `.env`. Для локальной PostgreSQL: `DATABASE_SSL=false`.
   При необходимости `yarn db:up` поднимет PostgreSQL из `docker-compose.yml`.
3. Выполнить `yarn db:init`, затем `yarn start:dev`.

`synchronize: false`: приложение не создаёт и не изменяет таблицы автоматически.
Существующий `db:init` идемпотентен; таблицы не пересоздаются. Новая система
миграций TypeORM на этом этапе не вводится.

Настройки первого блока:

```dotenv
ACCESS_TOKEN_TTL=5m
REFRESH_TOKEN_TTL=20s
IP_RESTRICTION_ENABLED=false
```

Access TTL по умолчанию — 5 минут, refresh TTL сохранён. Старое значение
`ACCESS_TOKEN_TTL` в окружении переопределяет дефолт: на сервере оно должно быть
не меньше 5 минут. Для следующего задания rate limit можно включить через
`IP_RESTRICTION_ENABLED=true`.

Маршруты: `/sa/users`, `/auth/registration`, `/auth/login`; глобальный префикс
`/hometask_17/api` не добавлялся. Для реальной регистрации с доставкой письма
требуется настроить `SMTP_URL`; тесты используют mock почтового сервиса.

## Проверки

`yarn test:e2e:local` запускает временный локальный PostgreSQL, затем e2e и
останавливает кластер. Требуются `initdb` и `pg_ctl` в PATH. Рабочая база не
используется. Каждая suite получает отдельную схему, удаляемую после выполнения.
Логи временного кластера остаются в `/tmp/blogger-typeorm-pg.*` для диагностики.

Для своего тестового PostgreSQL указать `TEST_DATABASE_URL` и выполнить
`yarn test:e2e --runInBand`. У пользователя БД должно быть право создавать схемы.
Без `TEST_DATABASE_URL` тестовый helper отказывается использовать рабочую базу.

`typeorm-users.e2e-spec.ts` проверяет admin CRUD, SQL-совместимость, большие ID,
мягкое удаление, повторное использование логина/email, поиск и пагинацию,
регистрацию/login без IP restriction и access TTL не меньше 300 секунд.
Существующие auth-тесты проверяют подтверждение регистрации, восстановление
пароля и сессии. Короткий TTL в тестах истечения токенов задаётся отдельным
тестовым провайдером. Rate-limit suite явно включает ограничение.

## Основания

- [Решение о границах миграции](adr/0001-postgresql-typeorm-users.md).
- [Пример преподавателя](https://github.com/it-incubator/nestjs/tree/main/examples/nestjs/typeorm-postgresql-wallets-entity-repository).
- [Интеграция NestJS и TypeORM](https://docs.nestjs.com/techniques/database).
- [TypeORM Entity](https://typeorm.io/docs/entity/entities/).

Из примера взяты Entity, доменные методы и внедрение `Repository`.
Автоматическая синхронизация схемы из примера здесь намеренно отключена.
