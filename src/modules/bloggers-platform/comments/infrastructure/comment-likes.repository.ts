import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import {
  CommentLike,
  CommentLikeDocument,
  CommentLikeModelType,
} from '../domain/comment-like.entity';
import { LikeStatus } from '../../enums/like-status.enum';

@Injectable()
export class CommentLikesRepository {
  constructor(
    @InjectModel(CommentLike.name)
    private CommentLikeModel: CommentLikeModelType,
  ) {}

  async findByCommentAndUser(
    commentId: string,
    userId: string,
  ): Promise<CommentLikeDocument | null> {
    return this.CommentLikeModel.findOne({ commentId, userId });
  }

  //реакции текущего пользователя на список комментариев — одним запросом, без N+1
  async findStatusesByCommentIds(
    commentIds: string[],
    userId: string,
  ): Promise<Map<string, LikeStatus>> {
    const likes = await this.CommentLikeModel.find({
      commentId: { $in: commentIds },
      userId,
    });

    return new Map(likes.map((like) => [like.commentId, like.status]));
  }

  async save(like: CommentLikeDocument) {
    await like.save();
  }
}
