import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PostsSqlQueryRepository } from '../../infrastructure/sql/query/posts.sql-query-repository';
import { PostViewDto } from '../../api/view-dto/posts.view-dto';

export class GetPostByIdQuery {
  constructor(
    public id: string,
    public userId: string | null,
  ) {}
}

@QueryHandler(GetPostByIdQuery)
export class GetPostByIdQueryHandler implements IQueryHandler<
  GetPostByIdQuery,
  PostViewDto
> {
  constructor(private postsQueryRepository: PostsSqlQueryRepository) {}

  async execute({ id, userId }: GetPostByIdQuery): Promise<PostViewDto> {
    return this.postsQueryRepository.getByIdOrNotFoundFail(id, userId);
  }
}
