import { postgresOptions } from './postgres-options';
import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from './database.constants';

//на всё приложение — один пул: репозитории инжектят его, а не создают свой
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: (): Pool => {
        const { url, ssl } = postgresOptions();
        return new Pool({
          connectionString: url,
          ssl,
          max: 10,
        });
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private pool: Pool) {}

  //без закрытия пула jest не завершается после e2e и висит с открытым хэндлом
  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
