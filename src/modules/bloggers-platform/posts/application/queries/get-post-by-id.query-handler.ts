import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PostsTypeOrmQueryRepository } from '../../infrastructure/typeorm/query/posts.typeorm-query-repository';
import { PostViewDto } from '../../api/view-dto/posts.view-dto';

export class GetPostByIdQuery {
  constructor(
    public id: string,
    //userId нужен для «моей реакции»; у анонимного читателя — null
    public userId: string | null = null,
  ) {}
}

@QueryHandler(GetPostByIdQuery)
export class GetPostByIdQueryHandler implements IQueryHandler<
  GetPostByIdQuery,
  PostViewDto
> {
  constructor(private postsQueryRepository: PostsTypeOrmQueryRepository) {}

  async execute({ id, userId }: GetPostByIdQuery): Promise<PostViewDto> {
    return this.postsQueryRepository.getByIdOrNotFoundFail(id, userId);
  }
}
