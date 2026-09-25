import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../core/database/database.constants';
import { LikeStatus } from '../enums/like-status.enum';

@Injectable()
export class LikesSqlRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async setStatus(
    target: 'post' | 'comment',
    targetId: string,
    userId: string,
    status: LikeStatus,
  ): Promise<void> {
    // Identifiers come only from this fixed map; request values are parameters.
    const { table, column } =
      target === 'post'
        ? { table: 'post_likes', column: 'post_id' }
        : { table: 'comment_likes', column: 'comment_id' };
    // Keep None rows so concurrent updates also serialize on the unique key.
    // Repeating a status must not change its timestamp or newest-likes order.
    await this.pool.query(
      `INSERT INTO ${table} (${column}, user_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (${column}, user_id) DO UPDATE
       SET status = EXCLUDED.status, added_at = clock_timestamp()
       WHERE ${table}.status IS DISTINCT FROM EXCLUDED.status`,
      [targetId, userId, status],
    );
  }
}
