import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CommentsTypeOrmRepository } from '../../infrastructure/typeorm/comments.typeorm-repository';
import { LikesTypeOrmRepository } from '../../../likes/infrastructure/typeorm/likes.typeorm-repository';
import { LikeStatus } from '../../../enums/like-status.enum';
import { UsersExternalQueryRepository } from '../../../../user-accounts/infrastructure/external-query/users.external-query-repository';

export class UpdateCommentLikeStatusCommand {
  constructor(
    public commentId: string,
    public userId: string,
    public likeStatus: LikeStatus,
  ) {}
}

@CommandHandler(UpdateCommentLikeStatusCommand)
export class UpdateCommentLikeStatusUseCase implements ICommandHandler<
  UpdateCommentLikeStatusCommand,
  void
> {
  constructor(
    private readonly comments: CommentsTypeOrmRepository,
    private readonly likes: LikesTypeOrmRepository,
    private readonly users: UsersExternalQueryRepository,
  ) {}

  async execute({
    commentId,
    userId,
    likeStatus,
  }: UpdateCommentLikeStatusCommand): Promise<void> {
    await this.comments.findOrNotFoundFail(commentId);
    await this.users.getByIdOrNotFoundFail(userId);
    await this.likes.setStatus('comment', commentId, userId, likeStatus);
  }
}
