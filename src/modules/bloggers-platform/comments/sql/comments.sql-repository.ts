import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../../core/database/database.constants';
import { CreateCommentDomainDto } from '../domain/dto/create-comment.domain.dto';

@Injectable()
export class CommentsSqlRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(dto: CreateCommentDomainDto): Promise<string> {
    const { rows } = await this.pool.query<{ id: string }>(
      `INSERT INTO comments (content, post_id, user_id, user_login)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [dto.content, dto.postId, dto.userId, dto.userLogin],
    );
    return rows[0].id;
  }
}
