# Проверка auth, IP restrictions, devices и testing

Дата: 2026-11-07. Коммиты не создавались.

## RED / GREEN

До исправлений новые тесты воспроизвели три ошибки:

- После `DELETE /testing/all-data` исчерпанный IP-лимит продолжал отвечать 429.
- Два одновременных запроса с одним refresh-токеном оба получали 200.
- Refresh-токен удалённого пользователя продолжал обновляться с ответом 200.

После переноса счётчиков в PostgreSQL, атомарной ротации сессии и проверки
пользователя все три проверки проходят. Добавлены проверки конкурентного
IP-лимита, разделения IP, включения ограничения по умолчанию, общего хранилища
счётчиков, истечения сессии и невозможности восстановления завершённой сессии.

## Проверки

```bash
yarn build
./node_modules/.bin/tsc --noEmit --pretty false
bash test/run-postgres-tests.sh --rootDir . --coverage \
  --collectCoverageFrom='src/core/rate-limiting/*.ts' \
  --collectCoverageFrom='src/modules/user-accounts/infrastructure/typeorm/security*.ts' \
  --collectCoverageFrom='src/modules/user-accounts/guards/refresh/refresh-token.strategy.ts' \
  --collectCoverageFrom='src/modules/user-accounts/application/usecases/refresh-token.usecase.ts'
```

Полный настроенный e2e-набор: **10 suites, 116 тестов — PASS**.
Покрытие выбранных изменённых файлов: **98% строк, 88% ветвей**.
Покрытие storage IP-счётчиков и обоих репозиториев устройств: 100% строк.
Тесты используют отдельный временный PostgreSQL, который останавливается после
проверки. Рабочая БД не изменялась.

Существующие исключения старых suites blogs/posts/comments/app в Jest config
сохранены. SQL-комментарии и реакции проверяются отдельными включёнными suites.
Известные проблемы общего smoke unit-теста и отсутствующего пакета
`typescript-eslint` описаны в [отчёте предыдущего этапа](typeorm-users.md);
в текущей задаче они не изменялись. Внешняя автопроверка и SMTP не запускались.

Перед запуском обновлённого приложения необходим `yarn db:init`, который
добавляет таблицу `ip_restrictions`. Access TTL сохранён 5 минут, refresh — 20
секунд; ограничения IP теперь включены по умолчанию.

## Уточнение второго блока — 2026-11-08

Требования TTL уточнены пользователем: access ровно 10 секунд, refresh ровно
20 секунд, IP restrictions включены. Старое значение access 5 минут заменено
в дефолте, `.env.example`, локальном `.env` и тестовом запуске.

RED: обновлённый unit-тест ожидал 10 секунд, получил 300. После исправления
оба unit-теста TTL проходят. Сборка и `tsc --noEmit` проходят.
E2E истечения токенов теперь использует реальные настройки приложения без
подмены JWT-провайдера: проверяет `exp - iat`, отказ после 10 секунд и успешный
refresh, пока не прошли 20 секунд.

Полный e2e-прогон с TTL 10s/20s: **10 suites, 116 тестов — PASS**
(`bash test/run-postgres-tests.sh`, 66.496 s). Коммитов и деплоя нет.
