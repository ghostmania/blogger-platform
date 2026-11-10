import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CommentsTypeOrmQueryRepository } from '../../infrastructure/typeorm/query/comments.typeorm-query-repository';
import { CommentViewDto } from '../../api/view-dto/comments.view-dto';

export class GetCommentByIdQuery {
  constructor(
    public id: string,
    public userId: string | null,
  ) {}
}

@QueryHandler(GetCommentByIdQuery)
export class GetCommentByIdQueryHandler implements IQueryHandler<
  GetCommentByIdQuery,
  CommentViewDto
> {
  constructor(
    private commentsQueryRepository: CommentsTypeOrmQueryRepository,
  ) {}

  async execute({ id, userId }: GetCommentByIdQuery): Promise<CommentViewDto> {
    return this.commentsQueryRepository.getByIdOrNotFoundFail(id, userId);
  }
}
