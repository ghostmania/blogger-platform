/**
 * Импортировать ПЕРВЫМ в спеке: auth.constants читает env при импорте, а
 * helpers/cookies тянет его статически. dotenv (из init-settings) не
 * перезаписывает уже заданные переменные, так что .env эти значения не перебьёт.
 * Дефолт приложения — 5m, короткие TTL нужны только тестам истечения токенов.
 */
process.env.ACCESS_TOKEN_TTL = '10s';
process.env.REFRESH_TOKEN_TTL = '20s';
