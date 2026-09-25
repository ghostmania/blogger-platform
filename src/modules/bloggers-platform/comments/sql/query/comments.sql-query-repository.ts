import { GetCommentsQueryParams } from '../../api/input-dto/get-comments-query-params.input-dto';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';
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
  likes_count: string;
  dislikes_count: string;
  my_status: LikeStatus;
  total_count?: string;
};

const likeColumns = (userParameter: '$2' | '$4') => `
  (SELECT COUNT(*) FROM comment_likes l WHERE l.comment_id = comments.id AND l.status = 'Like') AS likes_count,
  (SELECT COUNT(*) FROM comment_likes l WHERE l.comment_id = comments.id AND l.status = 'Dislike') AS dislikes_count,
  COALESCE((SELECT l.status FROM comment_likes l WHERE l.comment_id = comments.id AND l.user_id = ${userParameter}), 'None') AS my_status`;

@Injectable()
export class CommentsSqlQueryRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getByIdOrNotFoundFail(
    id: string,
    userId: string | null = null,
  ): Promise<CommentViewDto> {
    if (!/^\d+$/.test(id) || BigInt(id) > 9223372036854775807n) {
      this.notFound();
    }
    const { rows } = await this.pool.query<CommentRow>(
      `SELECT id, content, user_id, user_login, created_at, ${likeColumns('$2')}
       FROM comments WHERE id = $1`,
      [id, userId],
    );
    if (!rows.length) this.notFound();
    return this.toView(rows[0]);
  }

  async getAllForPost(
    postId: string,
    query: GetCommentsQueryParams,
    userId: string | null = null,
  ): Promise<PaginatedViewDto<CommentViewDto[]>> {
    const direction = query.sortDirection === 'asc' ? 'ASC' : 'DESC';
    const { rows } = await this.pool.query<CommentRow>(
      `SELECT id, content, user_id, user_login, created_at,
              COUNT(*) OVER() AS total_count, ${likeColumns('$4')}
       FROM comments WHERE post_id = $1
       ORDER BY created_at ${direction}, id ${direction}
       LIMIT $2 OFFSET $3`,
      [postId, query.pageSize, query.calculateSkip(), userId],
    );
    const totalCount = rows.length
      ? Number(rows[0].total_count)
      : Number(
          (
            await this.pool.query<{ count: string }>(
              'SELECT COUNT(*) AS count FROM comments WHERE post_id = $1',
              [postId],
            )
          ).rows[0].count,
        );
    return PaginatedViewDto.mapToView({
      items: rows.map((row) => this.toView(row)),
      totalCount,
      page: query.pageNumber,
      size: query.pageSize,
    });
  }

  private toView(row: CommentRow): CommentViewDto {
    return {
      id: row.id,
      content: row.content,
      commentatorInfo: { userId: row.user_id, userLogin: row.user_login },
      createdAt: row.created_at,
      likesInfo: {
        likesCount: Number(row.likes_count),
        dislikesCount: Number(row.dislikes_count),
        myStatus: row.my_status,
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
