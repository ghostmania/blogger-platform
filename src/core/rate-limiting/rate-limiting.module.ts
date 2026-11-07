import { Module } from '@nestjs/common';
import { TypeOrmThrottlerStorage } from './typeorm-throttler-storage';

@Module({
  providers: [TypeOrmThrottlerStorage],
  exports: [TypeOrmThrottlerStorage],
})
export class RateLimitingModule {}
