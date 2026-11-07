import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { IpRestriction } from './ip-restriction.entity';

@Injectable()
export class TypeOrmThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly dataSource: DataSource) {}

  // Sliding window, without extending the window on rejected retries.
  // Row locking keeps simultaneous requests across app instances within the limit.
  async increment(
    key: string,
    ttl: number,
    limit: number,
    _blockDuration: number,
    _throttlerName: string,
  ): ReturnType<ThrottlerStorage['increment']> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(IpRestriction);
      await repository
        .createQueryBuilder()
        .insert()
        .values({ key, hits: [] })
        .orIgnore()
        .execute();
      const record = await repository.findOneOrFail({
        where: { key },
        lock: { mode: 'pessimistic_write' },
      });
      const now = Date.now();
      const hits = record.hits.filter((time) => time > now - ttl);
      const isBlocked = hits.length >= limit;
      if (!isBlocked) hits.push(now);
      record.hits = hits;
      await repository.save(record);
      const timeToExpire = Math.max(
        0,
        Math.ceil(((hits[0] ?? now) + ttl - now) / 1000),
      );
      return {
        totalHits: hits.length + (isBlocked ? 1 : 0),
        timeToExpire,
        isBlocked,
        timeToBlockExpire: isBlocked ? timeToExpire : 0,
      };
    });
  }
}
