import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CommentsQueryRepository } from '../../infrastructure/query/comments.query-repository';
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
  constructor(private commentsQueryRepository: CommentsQueryRepository) {}

  async execute({ id, userId }: GetCommentByIdQuery): Promise<CommentViewDto> {
    return this.commentsQueryRepository.getByIdOrNotFoundFail(id, userId);
  }
}
