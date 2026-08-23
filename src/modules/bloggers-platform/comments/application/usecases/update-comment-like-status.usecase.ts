import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import {
  CommentLike,
  CommentLikeModelType,
} from '../../domain/comment-like.entity';
import { CommentsRepository } from '../../infrastructure/comments.repository';
import { CommentLikesRepository } from '../../infrastructure/comment-likes.repository';
import { LikeStatus } from '../../../enums/like-status.enum';

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
    @InjectModel(CommentLike.name)
    private CommentLikeModel: CommentLikeModelType,
    private commentsRepository: CommentsRepository,
    private commentLikesRepository: CommentLikesRepository,
  ) {}

  async execute({
    commentId,
    userId,
    likeStatus,
  }: UpdateCommentLikeStatusCommand): Promise<void> {
    const comment = await this.commentsRepository.findOrNotFoundFail(commentId);

    const existingLike = await this.commentLikesRepository.findByCommentAndUser(
      commentId,
      userId,
    );

    const oldStatus = existingLike?.status ?? LikeStatus.None;

    if (oldStatus === likeStatus) {
      return;
    }

    if (existingLike) {
      existingLike.updateStatus(likeStatus);
      await this.commentLikesRepository.save(existingLike);
    } else {
      const like = this.CommentLikeModel.createInstance({
        commentId,
        userId,
        status: likeStatus,
      });

      await this.commentLikesRepository.save(like);
    }

    comment.applyLikeStatusChange(oldStatus, likeStatus);

    await this.commentsRepository.save(comment);
  }
}
