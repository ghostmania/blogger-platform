const NUMERIC = /^\d+$/;
const BIGINT_MAX = 9223372036854775807n;

/**
 * id в таблицах — bigint. Произвольная строка из URL роняет Postgres ошибкой
 * 22P02 (500 вместо 404), а число больше int8 — 22003. Поэтому формат проверяем
 * ДО обращения к БД, и «неверный формат» трактуем как «не найдено».
 */
export function isBigintId(id: string): boolean {
  return NUMERIC.test(id) && BigInt(id) <= BIGINT_MAX;
}
