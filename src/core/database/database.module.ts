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
        const connectionString = process.env.DATABASE_URL;

        if (!connectionString) {
          //падаем громко на старте: молчаливый дефолт увёл бы запись
          //в непонятную базу
          throw new Error('DATABASE_URL is not set');
        }

        return new Pool({
          connectionString,
          //Neon терминирует TLS валидным сертификатом, но проверить цепочку
          //в контейнере часто нечем; канал при этом остаётся зашифрованным
          ssl: { rejectUnauthorized: false },
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
