import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../core/database/database.constants';

@Controller('testing')
export class TestingController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Delete('all-data')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAll(): Promise<void> {
    await this.pool.query(
      'TRUNCATE TABLE device_sessions, users, blogs, ip_restrictions RESTART IDENTITY CASCADE',
    );
  }
}
