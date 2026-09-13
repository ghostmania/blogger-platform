import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Pool } from 'pg';
import { PG_POOL } from '../../core/database/database.constants';

@Controller('testing')
export class TestingController {
  constructor(
    @InjectConnection() private readonly databaseConnection: Connection,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  //чистим ОБА хранилища: какое из них активно, решает USER_ACCOUNTS_DB,
  //а тестам проще всегда стартовать с чистого листа в любом режиме
  @Delete('all-data')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAll() {
    await Promise.all([this.clearMongo(), this.clearPostgres()]);

    return {
      status: 'succeeded',
    };
  }

  private async clearMongo(): Promise<void> {
    const collections = await this.databaseConnection.listCollections();

    await Promise.all(
      collections.map((collection) =>
        this.databaseConnection.collection(collection.name).deleteMany({}),
      ),
    );
  }

  private async clearPostgres(): Promise<void> {
    //TRUNCATE одним оператором снимает вопрос порядка удаления при FK,
    //RESTART IDENTITY сбрасывает последовательность bigserial
    await this.pool.query(
      'TRUNCATE TABLE device_sessions, users RESTART IDENTITY CASCADE',
    );
  }
}
