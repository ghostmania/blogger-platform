import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../../../core/database/database.constants';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { CommentViewDto } from '../../api/view-dto/comments.view-dto';
import { LikeStatus } from '../../../enums/like-status.enum';

type CommentRow = {
  id: string;
  content: string;
  user_id: string;
  user_login: string;
  created_at: Date;
};

@Injectable()
export class CommentsSqlQueryRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getByIdOrNotFoundFail(
    id: string,
    _userId: string | null = null,
  ): Promise<CommentViewDto> {
    if (!/^\d+$/.test(id) || BigInt(id) > 9223372036854775807n) {
      this.notFound();
    }
    const { rows } = await this.pool.query<CommentRow>(
      `SELECT id, content, user_id, user_login, created_at
       FROM comments WHERE id = $1`,
      [id],
    );
    if (!rows.length) this.notFound();
    const row = rows[0];
    return {
      id: row.id,
      content: row.content,
      commentatorInfo: { userId: row.user_id, userLogin: row.user_login },
      createdAt: row.created_at,
      likesInfo: {
        likesCount: 0,
        dislikesCount: 0,
        myStatus: LikeStatus.None,
      },
    };
  }

  private notFound(): never {
    throw new DomainException({
      code: DomainExceptionCode.NotFound,
      message: 'Comment not found',
    });
  }
}
