import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';
import { GetPostsQueryParams } from '../../../posts/api/input-dto/get-posts-query-params.input-dto';
import { PostViewDto } from '../../../posts/api/view-dto/posts.view-dto';
import { PostsTypeOrmQueryRepository } from '../../../posts/infrastructure/typeorm/query/posts.typeorm-query-repository';
import { BlogsTypeOrmQueryRepository } from '../../infrastructure/typeorm/query/blogs.typeorm-query-repository';

export class GetBlogPostsQuery {
  constructor(
    public readonly blogId: string,
    public readonly queryParams: GetPostsQueryParams,
    //userId понадобится для myStatus, когда лайки переедут на TypeORM
    public readonly userId: string | null = null,
  ) {}
}

@QueryHandler(GetBlogPostsQuery)
export class GetBlogPostsQueryHandler implements IQueryHandler<
  GetBlogPostsQuery,
  PaginatedViewDto<PostViewDto[]>
> {
  constructor(
    private readonly blogsQueryRepository: BlogsTypeOrmQueryRepository,
    private readonly postsQueryRepository: PostsTypeOrmQueryRepository,
  ) {}

  async execute({
    blogId,
    queryParams,
  }: GetBlogPostsQuery): Promise<PaginatedViewDto<PostViewDto[]>> {
    //404, если блога нет — пустой список для несуществующего блога был бы ошибкой контракта
    await this.blogsQueryRepository.getByIdOrNotFoundFail(blogId);
    return this.postsQueryRepository.getAll(queryParams, blogId);
  }
}
