import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { DomainException } from '../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../core/exceptions/domain-exception-codes';
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
  async findOrNotFoundFail(
    id: string,
  ): Promise<{ id: string; user_id: string }> {
    if (!/^\d+$/.test(id) || BigInt(id) > 9223372036854775807n) this.notFound();
    const { rows } = await this.pool.query<{ id: string; user_id: string }>(
      'SELECT id, user_id FROM comments WHERE id = $1',
      [id],
    );
    if (!rows.length) this.notFound();
    return rows[0];
  }

  async updateContent(
    id: string,
    userId: string,
    content: string,
  ): Promise<void> {
    const { rowCount } = await this.pool.query(
      'UPDATE comments SET content = $3, updated_at = now() WHERE id = $1 AND user_id = $2',
      [id, userId, content],
    );
    if (!rowCount) this.notFound();
  }

  async deleteById(id: string, userId: string): Promise<void> {
    const { rowCount } = await this.pool.query(
      'DELETE FROM comments WHERE id = $1 AND user_id = $2',
      [id, userId],
    );
    if (!rowCount) this.notFound();
  }

  private notFound(): never {
    throw new DomainException({
      code: DomainExceptionCode.NotFound,
      message: 'Comment not found',
    });
  }
}
