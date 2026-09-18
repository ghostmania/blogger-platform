import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Pool } from 'pg';
import { PG_POOL } from '../../../../../core/database/database.constants';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';
import { DomainException } from '../../../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../../../core/exceptions/domain-exception-codes';
import { GetPostsQueryParams } from '../../../posts/api/input-dto/get-posts-query-params.input-dto';

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

export class BlogPostViewDto {
  id: string;
  title: string;
  shortDescription: string;
  content: string;
  blogId: string;
  blogName: string;
  createdAt: Date;
  extendedLikesInfo: {
    likesCount: number;
    dislikesCount: number;
    myStatus: 'None';
    newestLikes: [];
  };
}

export class GetBlogPostsQuery {
  constructor(
    public readonly blogId: string,
    public readonly queryParams: GetPostsQueryParams,
  ) {}
}

@QueryHandler(GetBlogPostsQuery)
export class GetBlogPostsQueryHandler implements IQueryHandler<
  GetBlogPostsQuery,
  PaginatedViewDto<BlogPostViewDto[]>
> {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async execute({
    blogId,
    queryParams,
  }: GetBlogPostsQuery): Promise<PaginatedViewDto<BlogPostViewDto[]>> {
    await this.ensureBlogExists(blogId);
    const columns: Record<string, string> = {
      title: 'title',
      shortDescription: 'short_description',
      content: 'content',
      blogId: 'blog_id',
      blogName: 'blog_name',
      createdAt: 'created_at',
    };
    const sortColumn = columns[queryParams.sortBy] ?? 'created_at';
    const sortDirection = queryParams.sortDirection === 'asc' ? 'ASC' : 'DESC';
    const { rows } = await this.pool.query<PostRow>(
      `SELECT id, title, short_description, content, blog_id, blog_name, created_at, COUNT(*) OVER() AS total_count
       FROM posts WHERE blog_id = $1 ORDER BY ${sortColumn} ${sortDirection} LIMIT $2 OFFSET $3`,
      [blogId, queryParams.pageSize, queryParams.calculateSkip()],
    );
    return PaginatedViewDto.mapToView({
      items: rows.map((row) => this.toView(row)),
      totalCount: rows.length ? Number(rows[0].total_count) : 0,
      page: queryParams.pageNumber,
      size: queryParams.pageSize,
    });
  }

  private async ensureBlogExists(id: string): Promise<void> {
    if (!/^\d+$/.test(id)) this.notFound();
    const { rowCount } = await this.pool.query(
      'SELECT 1 FROM blogs WHERE id = $1',
      [id],
    );
    if (!rowCount) this.notFound();
  }

  private toView(row: PostRow): BlogPostViewDto {
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
        myStatus: 'None',
        newestLikes: [],
      },
    };
  }

  private notFound(): never {
    throw new DomainException({
      code: DomainExceptionCode.NotFound,
      message: 'Blog not found',
    });
  }
}
