import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../../../../core/database/database.constants';
import { PaginatedViewDto } from '../../../../../../core/dto/base.paginated.view-dto';
import { DomainException } from '../../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../../core/exceptions/domain-exception-codes';
import { LikeStatus } from '../../../../enums/like-status.enum';
import { GetPostsQueryParams } from '../../../api/input-dto/get-posts-query-params.input-dto';
import { PostViewDto } from '../../../api/view-dto/posts.view-dto';

type PostRow = {
  id: string;
  title: string;
  short_description: string;
  content: string;
  blog_id: string;
  blog_name: string;
  created_at: Date;
  likes_count: string;
  dislikes_count: string;
  my_status: LikeStatus;
  newest_likes: PostViewDto['extendedLikesInfo']['newestLikes'];
  total_count?: string;
};

const likeColumns = (userParameter: '$2' | '$4') => `
  (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = posts.id AND l.status = 'Like') AS likes_count,
  (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = posts.id AND l.status = 'Dislike') AS dislikes_count,
  COALESCE((SELECT l.status FROM post_likes l WHERE l.post_id = posts.id AND l.user_id = ${userParameter}), 'None') AS my_status,
  (SELECT COALESCE(json_agg(json_build_object(
     'addedAt', recent.added_at, 'userId', recent.user_id::text, 'login', recent.login
   ) ORDER BY recent.added_at DESC, recent.user_id DESC), '[]'::json)
   FROM (
     SELECT l.added_at, l.user_id, u.login FROM post_likes l
     JOIN users u ON u.id = l.user_id
     WHERE l.post_id = posts.id AND l.status = 'Like'
     ORDER BY l.added_at DESC, l.user_id DESC LIMIT 3
   ) recent) AS newest_likes`;

@Injectable()
export class PostsSqlQueryRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getAll(
    query: GetPostsQueryParams,
    blogId?: string,
    userId: string | null = null,
  ): Promise<PaginatedViewDto<PostViewDto[]>> {
    const sortColumns: Record<string, string> = {
      title: 'title',
      shortDescription: 'short_description',
      content: 'content',
      blogId: 'blog_id',
      blogName: 'blog_name',
      createdAt: 'created_at',
    };
    const sortColumn = sortColumns[query.sortBy] ?? 'created_at';
    const sortDirection = query.sortDirection === 'asc' ? 'ASC' : 'DESC';
    const { rows } = await this.pool.query<PostRow>(
      `SELECT id, title, short_description, content, blog_id, blog_name, created_at,
              COUNT(*) OVER() AS total_count, ${likeColumns('$4')}
       FROM posts
       WHERE ($1::bigint IS NULL OR blog_id = $1)
       ORDER BY ${sortColumn} ${sortDirection}, id ${sortDirection}
       LIMIT $2 OFFSET $3`,
      [blogId ?? null, query.pageSize, query.calculateSkip(), userId],
    );

    // An empty page still needs the total number of matching posts.
    const totalCount = rows.length
      ? Number(rows[0].total_count)
      : Number(
          (
            await this.pool.query<{ count: string }>(
              'SELECT COUNT(*) AS count FROM posts WHERE ($1::bigint IS NULL OR blog_id = $1)',
              [blogId ?? null],
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

  async getByIdOrNotFoundFail(
    id: string,
    userId: string | null = null,
  ): Promise<PostViewDto> {
    if (!/^\d+$/.test(id) || BigInt(id) > 9223372036854775807n) {
      this.notFound();
    }
    const { rows } = await this.pool.query<PostRow>(
      `SELECT id, title, short_description, content, blog_id, blog_name, created_at, ${likeColumns('$2')}
       FROM posts WHERE id = $1`,
      [id, userId],
    );
    if (!rows.length) this.notFound();
    return this.toView(rows[0]);
  }

  private toView(row: PostRow): PostViewDto {
    return {
      id: row.id,
      title: row.title,
      shortDescription: row.short_description,
      content: row.content,
      blogId: row.blog_id,
      blogName: row.blog_name,
      createdAt: row.created_at,
      extendedLikesInfo: {
        likesCount: Number(row.likes_count),
        dislikesCount: Number(row.dislikes_count),
        myStatus: row.my_status,
        newestLikes: row.newest_likes,
      },
    };
  }

  private notFound(): never {
    throw new DomainException({
      code: DomainExceptionCode.NotFound,
      message: 'Post not found',
    });
  }
}
