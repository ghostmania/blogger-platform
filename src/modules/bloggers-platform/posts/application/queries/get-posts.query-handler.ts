import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PostsQueryRepository } from '../../infrastructure/query/posts.query-repository';
import { GetPostsQueryParams } from '../../api/input-dto/get-posts-query-params.input-dto';
import { PostViewDto } from '../../api/view-dto/posts.view-dto';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';

export class GetPostsQuery {
  constructor(
    public queryParams: GetPostsQueryParams,
    public userId: string | null,
  ) {}
}

@QueryHandler(GetPostsQuery)
export class GetPostsQueryHandler implements IQueryHandler<
  GetPostsQuery,
  PaginatedViewDto<PostViewDto[]>
> {
  constructor(private postsQueryRepository: PostsQueryRepository) {}

  async execute({
    queryParams,
    userId,
  }: GetPostsQuery): Promise<PaginatedViewDto<PostViewDto[]>> {
    return this.postsQueryRepository.getAll(queryParams, undefined, userId);
  }
}
