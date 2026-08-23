import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import { PostLike, PostLikeModelType } from '../../domain/post-like.entity';
import { PostsRepository } from '../../infrastructure/posts.repository';
import { PostLikesRepository } from '../../infrastructure/post-likes.repository';
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
    @InjectModel(PostLike.name)
    private PostLikeModel: PostLikeModelType,
    private postsRepository: PostsRepository,
    private postLikesRepository: PostLikesRepository,
    private usersExternalQueryRepository: UsersExternalQueryRepository,
  ) {}

  async execute({
    postId,
    userId,
    likeStatus,
  }: UpdatePostLikeStatusCommand): Promise<void> {
    const post = await this.postsRepository.findOrNotFoundFail(postId);

    const existingLike = await this.postLikesRepository.findByPostAndUser(
      postId,
      userId,
    );

    const oldStatus = existingLike?.status ?? LikeStatus.None;

    if (oldStatus === likeStatus) {
      return;
    }

    if (existingLike) {
      existingLike.updateStatus(likeStatus);
      await this.postLikesRepository.save(existingLike);
    } else {
      //login денормализуем в документ лайка, чтобы собирать newestLikes без джойна
      const user =
        await this.usersExternalQueryRepository.getByIdOrNotFoundFail(userId);

      const like = this.PostLikeModel.createInstance({
        postId,
        userId,
        login: user.login,
        status: likeStatus,
      });

      await this.postLikesRepository.save(like);
    }

    post.applyLikeStatusChange(oldStatus, likeStatus);

    await this.postsRepository.save(post);
  }
}
