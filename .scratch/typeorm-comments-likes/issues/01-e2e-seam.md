# 01: Перенос e2e комментариев и реакций на стандартный шов

**What to build:** одна спека `typeorm-comments-likes` через `initSettings` и временный Postgres покрывает текущее поведение комментариев и реакций; самодельные спеки, их скрипт и команда `test:comments:sql` удалены.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Сценарии: создание/чтение/правка/удаление автором, 403 для чужого, 404/401/400, пагинация и сортировка, конкурентные и меняющиеся реакции комментариев, очистка через testing/all-data, legacy-строки с большими id
- [ ] Сценарии реакций постов и последних лайков присутствуют и помечены пропущенными до тикета 04
- [ ] `comments-likes-sql`, `create-comment`, `run-comments-sql-tests.sh`, `test:comments:sql` удалены
- [ ] Полный `yarn test:e2e:local` зелёный на raw SQL
