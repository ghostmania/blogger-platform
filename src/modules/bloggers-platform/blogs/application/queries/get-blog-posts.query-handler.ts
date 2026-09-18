import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';
import { GetPostsQueryParams } from '../../../posts/api/input-dto/get-posts-query-params.input-dto';
import { PostViewDto } from '../../../posts/api/view-dto/posts.view-dto';
import { PostsSqlQueryRepository } from '../../../posts/infrastructure/sql/query/posts.sql-query-repository';
import { BlogsSqlQueryRepository } from '../../infrastructure/sql/query/blogs.sql-query-repository';

export class GetBlogPostsQuery {
  constructor(
    public readonly blogId: string,
    public readonly queryParams: GetPostsQueryParams,
    public readonly userId: string | null = null,
  ) {}
}

@QueryHandler(GetBlogPostsQuery)
export class GetBlogPostsQueryHandler implements IQueryHandler<
  GetBlogPostsQuery,
  PaginatedViewDto<PostViewDto[]>
> {
  constructor(
    private readonly blogsQueryRepository: BlogsSqlQueryRepository,
    private readonly postsQueryRepository: PostsSqlQueryRepository,
  ) {}

  async execute({
    blogId,
    queryParams,
    userId,
  }: GetBlogPostsQuery): Promise<PaginatedViewDto<PostViewDto[]>> {
    await this.blogsQueryRepository.getByIdOrNotFoundFail(blogId);
    return this.postsQueryRepository.getAll(queryParams, blogId, userId);
  }
}
