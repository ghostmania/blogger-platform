import { readFileSync } from 'fs';
import { join } from 'path';

//init.sql лежит рядом с этим файлом и НЕ копируется в dist при nest build:
//схема применяется скриптом yarn db:init и тестами, но не при старте приложения
const SCHEMA_PATH = join(__dirname, 'init.sql');

//достаточно любого соединения с методом query: TypeORM DataSource или pg Pool
export interface SqlRunner {
  query(sql: string): Promise<unknown>;
}

/**
 * Создаёт таблицы и индексы. Весь DDL идемпотентен (IF NOT EXISTS),
 * поэтому функцию можно звать сколько угодно раз.
 */
export async function applySchema(runner: SqlRunner): Promise<void> {
  await runner.query(readFileSync(SCHEMA_PATH, 'utf-8'));
}
