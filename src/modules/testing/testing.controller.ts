import { Controller, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('testing')
export class TestingController {
  constructor(private readonly dataSource: DataSource) {}

  //каскад от users/blogs сносит сессии, посты, комментарии и реакции
  @Delete('all-data')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAll(): Promise<void> {
    await this.dataSource.query(
      'TRUNCATE TABLE device_sessions, users, blogs, ip_restrictions RESTART IDENTITY CASCADE',
    );
  }
}
