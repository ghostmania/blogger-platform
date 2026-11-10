import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PostsTypeOrmRepository } from '../../infrastructure/typeorm/posts.typeorm-repository';
import { LikesTypeOrmRepository } from '../../../likes/infrastructure/typeorm/likes.typeorm-repository';
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
    private readonly posts: PostsTypeOrmRepository,
    private readonly likes: LikesTypeOrmRepository,
    private readonly users: UsersExternalQueryRepository,
  ) {}

  async execute({
    postId,
    userId,
    likeStatus,
  }: UpdatePostLikeStatusCommand): Promise<void> {
    await this.posts.findOrNotFoundFail(postId);
    await this.users.getByIdOrNotFoundFail(userId);
    await this.likes.setStatus('post', postId, userId, likeStatus);
  }
}
