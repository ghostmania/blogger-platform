import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

//init.sql лежит рядом с этим файлом и НЕ копируется в dist при nest build:
//схема применяется скриптом yarn db:init и тестами, но не при старте приложения
const SCHEMA_PATH = join(__dirname, 'init.sql');

/**
 * Создаёт таблицы и индексы. Весь DDL идемпотентен (IF NOT EXISTS),
 * поэтому функцию можно звать сколько угодно раз.
 */
export async function applySchema(pool: Pool): Promise<void> {
  await pool.query(readFileSync(SCHEMA_PATH, 'utf-8'));
}
