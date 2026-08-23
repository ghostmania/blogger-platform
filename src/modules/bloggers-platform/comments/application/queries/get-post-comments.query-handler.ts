import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CommentsQueryRepository } from '../../infrastructure/query/comments.query-repository';
import { PostsQueryRepository } from '../../../posts/infrastructure/query/posts.query-repository';
import { GetCommentsQueryParams } from '../../api/input-dto/get-comments-query-params.input-dto';
import { CommentViewDto } from '../../api/view-dto/comments.view-dto';
import { PaginatedViewDto } from '../../../../../core/dto/base.paginated.view-dto';

export class GetPostCommentsQuery {
  constructor(
    public postId: string,
    public queryParams: GetCommentsQueryParams,
    public userId: string | null,
  ) {}
}

@QueryHandler(GetPostCommentsQuery)
export class GetPostCommentsQueryHandler implements IQueryHandler<
  GetPostCommentsQuery,
  PaginatedViewDto<CommentViewDto[]>
> {
  constructor(
    private commentsQueryRepository: CommentsQueryRepository,
    private postsQueryRepository: PostsQueryRepository,
  ) {}

  async execute({
    postId,
    queryParams,
    userId,
  }: GetPostCommentsQuery): Promise<PaginatedViewDto<CommentViewDto[]>> {
    //404, если поста нет
    await this.postsQueryRepository.getByIdOrNotFoundFail(postId);

    return this.commentsQueryRepository.getAllForPost(
      postId,
      queryParams,
      userId,
    );
  }
}
