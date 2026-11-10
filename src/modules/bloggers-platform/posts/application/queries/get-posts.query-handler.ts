import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PostsTypeOrmQueryRepository } from '../../infrastructure/typeorm/query/posts.typeorm-query-repository';
import { GetPostsQueryParams } from '../../api/input-dto/get-posts-query-params.input-dto';
import { PostViewDto } from '../../api/view-dto/posts.view-dto';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';

export class GetPostsQuery {
  constructor(
    public queryParams: GetPostsQueryParams,
    //userId нужен для «моей реакции»; у анонимного читателя — null
    public userId: string | null = null,
  ) {}
}

@QueryHandler(GetPostsQuery)
export class GetPostsQueryHandler implements IQueryHandler<
  GetPostsQuery,
  PaginatedViewDto<PostViewDto[]>
> {
  constructor(private postsQueryRepository: PostsTypeOrmQueryRepository) {}

  async execute({
    queryParams,
    userId,
  }: GetPostsQuery): Promise<PaginatedViewDto<PostViewDto[]>> {
    return this.postsQueryRepository.getAll(queryParams, undefined, userId);
  }
}
