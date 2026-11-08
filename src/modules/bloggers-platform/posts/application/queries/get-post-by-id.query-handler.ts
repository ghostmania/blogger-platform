import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PostsTypeOrmQueryRepository } from '../../infrastructure/typeorm/query/posts.typeorm-query-repository';
import { PostViewDto } from '../../api/view-dto/posts.view-dto';

export class GetPostByIdQuery {
  constructor(
    public id: string,
    //userId понадобится для myStatus, когда лайки переедут на TypeORM
    public userId: string | null = null,
  ) {}
}

@QueryHandler(GetPostByIdQuery)
export class GetPostByIdQueryHandler implements IQueryHandler<
  GetPostByIdQuery,
  PostViewDto
> {
  constructor(private postsQueryRepository: PostsTypeOrmQueryRepository) {}

  async execute({ id }: GetPostByIdQuery): Promise<PostViewDto> {
    return this.postsQueryRepository.getByIdOrNotFoundFail(id);
  }
}
