import { postgresOptions } from './postgres-options';
import 'dotenv/config';
import { Pool } from 'pg';
import { applySchema } from './apply-schema';

async function main(): Promise<void> {
  const { url, ssl } = postgresOptions();
  const pool = new Pool({ connectionString: url, ssl });

  try {
    await applySchema(pool);
    console.log('Schema applied');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
