import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PostsQueryRepository } from '../../infrastructure/query/posts.query-repository';
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
  constructor(private postsQueryRepository: PostsQueryRepository) {}

  async execute({ id, userId }: GetPostByIdQuery): Promise<PostViewDto> {
    return this.postsQueryRepository.getByIdOrNotFoundFail(id, userId);
  }
}
