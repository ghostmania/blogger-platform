-- Схема SQL-версии user-accounts.
-- Весь DDL идемпотентен: скрипт применяется и вручную (yarn db:init), и из тестов.

CREATE TABLE IF NOT EXISTS users (
  id                       bigserial    PRIMARY KEY,
  login                    varchar(10)  NOT NULL,
  email                    varchar(100) NOT NULL,
  password_hash            text         NOT NULL,
  confirmation_code        uuid,
  confirmation_expiration  timestamptz,
  is_confirmed             boolean      NOT NULL DEFAULT false,
  recovery_code            uuid,
  recovery_expiration      timestamptz,
  first_name               varchar(50),
  last_name                varchar(50),
  created_at               timestamptz  NOT NULL DEFAULT now(),
  updated_at               timestamptz  NOT NULL DEFAULT now(),
  deleted_at               timestamptz
);

-- прямой перенос partialFilterExpression из монго-схемы: soft-deleted юзер
-- не должен блокировать повторную регистрацию того же логина/email
CREATE UNIQUE INDEX IF NOT EXISTS users_login_unique_idx
  ON users (login) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
  ON users (email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS users_confirmation_code_idx
  ON users (confirmation_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS users_recovery_code_idx
  ON users (recovery_code) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS device_sessions (
  -- deviceId генерируется в use case и живёт внутри refresh-токена,
  -- поэтому он же и первичный ключ: суррогатный id тут не нужен
  device_id        uuid         PRIMARY KEY,
  user_id          bigint       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip               varchar(64)  NOT NULL,
  title            varchar(255) NOT NULL,
  last_active_date timestamptz  NOT NULL,
  expiration_date  timestamptz  NOT NULL,
  created_at       timestamptz  NOT NULL DEFAULT now(),
  updated_at       timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS device_sessions_user_id_idx
  ON device_sessions (user_id);

CREATE TABLE IF NOT EXISTS blogs (
  id            bigserial    PRIMARY KEY,
  name          varchar(15)  NOT NULL,
  description   varchar(500) NOT NULL,
  website_url   varchar(100) NOT NULL,
  is_membership boolean      NOT NULL DEFAULT false,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);
