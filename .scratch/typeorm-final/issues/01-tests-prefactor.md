# 01: Тесты переводятся на /sa/users, мёртвые спеки удаляются
**What to build:** `UsersTestManager` и спеки `users`, `auth`, `rate-limit` используют `/sa/users`; Mongo-спеки `blogs/posts/comments/app` и `app.controller.spec` удалены, `testPathIgnorePatterns` только `node_modules`; полный e2e зелёный на текущем коде.
**Blocked by:** None
**Status:** ready-for-agent
