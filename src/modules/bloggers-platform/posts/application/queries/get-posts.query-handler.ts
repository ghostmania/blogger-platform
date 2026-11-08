import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PostsTypeOrmQueryRepository } from '../../infrastructure/typeorm/query/posts.typeorm-query-repository';
import { GetPostsQueryParams } from '../../api/input-dto/get-posts-query-params.input-dto';
import { PostViewDto } from '../../api/view-dto/posts.view-dto';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';

export class GetPostsQuery {
  constructor(
    public queryParams: GetPostsQueryParams,
    //userId понадобится для myStatus, когда лайки переедут на TypeORM
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
  }: GetPostsQuery): Promise<PaginatedViewDto<PostViewDto[]>> {
    return this.postsQueryRepository.getAll(queryParams);
  }
}
