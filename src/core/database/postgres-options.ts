export function postgresOptions() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return {
    url,
    ssl:
      process.env.DATABASE_SSL === 'false'
        ? false
        : { rejectUnauthorized: false },
  };
}

/**
 * Общие настройки пула для обоих подключений (pg Pool и TypeORM).
 * В serverless контейнер замораживают между вызовами, и соединение к Neon может
 * умереть молча: без таймаутов запрос висел бы до maxDuration функции, а не
 * падал быстро. Небольшой max — у приложения два пула на каждый инстанс.
 */
export const poolOptions = {
  max: 5,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 10_000,
  query_timeout: 15_000,
};
