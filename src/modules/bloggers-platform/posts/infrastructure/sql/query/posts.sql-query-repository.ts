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
  total_count?: string;
};

@Injectable()
export class PostsSqlQueryRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getAll(
    query: GetPostsQueryParams,
    blogId?: string,
    _userId: string | null = null,
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
              COUNT(*) OVER() AS total_count
       FROM posts
       WHERE ($1::bigint IS NULL OR blog_id = $1)
       ORDER BY ${sortColumn} ${sortDirection}
       LIMIT $2 OFFSET $3`,
      [blogId ?? null, query.pageSize, query.calculateSkip()],
    );

    return PaginatedViewDto.mapToView({
      items: rows.map((row) => this.toView(row)),
      totalCount: rows.length ? Number(rows[0].total_count) : 0,
      page: query.pageNumber,
      size: query.pageSize,
    });
  }

  async getByIdOrNotFoundFail(
    id: string,
    _userId: string | null = null,
  ): Promise<PostViewDto> {
    if (!/^\d+$/.test(id)) this.notFound();
    const { rows } = await this.pool.query<PostRow>(
      `SELECT id, title, short_description, content, blog_id, blog_name, created_at
       FROM posts WHERE id = $1`,
      [id],
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
        likesCount: 0,
        dislikesCount: 0,
        myStatus: LikeStatus.None,
        newestLikes: [],
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
