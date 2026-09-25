import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PostsSqlQueryRepository } from '../../infrastructure/sql/query/posts.sql-query-repository';
import { LikesSqlRepository } from '../../../likes/likes.sql-repository';
import { LikeStatus } from '../../../enums/like-status.enum';
import { UsersExternalQueryRepository } from '../../../../user-accounts/infrastructure/external-query/users.external-query-repository';

export class UpdatePostLikeStatusCommand {
  constructor(
    public postId: string,
    public userId: string,
    public likeStatus: LikeStatus,
  ) {}
}

@CommandHandler(UpdatePostLikeStatusCommand)
export class UpdatePostLikeStatusUseCase implements ICommandHandler<
  UpdatePostLikeStatusCommand,
  void
> {
  constructor(
    private readonly targets: PostsSqlQueryRepository,
    private readonly likes: LikesSqlRepository,
    private readonly users: UsersExternalQueryRepository,
  ) {}

  async execute({
    postId,
    userId,
    likeStatus,
  }: UpdatePostLikeStatusCommand): Promise<void> {
    await this.targets.getByIdOrNotFoundFail(postId);
    await this.users.getByIdOrNotFoundFail(userId);
    await this.likes.setStatus('post', postId, userId, likeStatus);
  }
}
