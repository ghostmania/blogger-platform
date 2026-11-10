import 'dotenv/config';
import { DataSource } from 'typeorm';
import { postgresOptions } from './postgres-options';
import { applySchema } from './apply-schema';

//yarn db:init — применяет init.sql через то же подключение TypeORM, что и приложение
async function main(): Promise<void> {
  const dataSource = new DataSource({ type: 'postgres', ...postgresOptions() });
  await dataSource.initialize();

  try {
    await applySchema(dataSource);
    console.log('Schema applied');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
