import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import {
  PostLike,
  PostLikeDocument,
  PostLikeModelType,
} from '../domain/post-like.entity';
import { LikeStatus } from '../../enums/like-status.enum';

//сколько последних лайков отдаём в extendedLikesInfo.newestLikes
const NEWEST_LIKES_LIMIT = 3;

//проекция лайка для newestLikes: сам документ на чтении не нужен
export type NewestLike = {
  userId: string;
  login: string;
  createdAt: Date;
};

@Injectable()
export class PostLikesRepository {
  constructor(
    @InjectModel(PostLike.name) private PostLikeModel: PostLikeModelType,
  ) {}

  async findByPostAndUser(
    postId: string,
    userId: string,
  ): Promise<PostLikeDocument | null> {
    return this.PostLikeModel.findOne({ postId, userId });
  }

  //реакции текущего пользователя на список постов — одним запросом, без N+1
  async findStatusesByPostIds(
    postIds: string[],
    userId: string,
  ): Promise<Map<string, LikeStatus>> {
    const likes = await this.PostLikeModel.find({
      postId: { $in: postIds },
      userId,
    });

    return new Map(likes.map((like) => [like.postId, like.status]));
  }

  /**
   * Последние NEWEST_LIKES_LIMIT лайков для каждого из постов — одной агрегацией.
   * Отсечка делается на стороне монги ($slice), чтобы не вытягивать все лайки
   * страницы постов в приложение.
   */
  async findNewestLikesByPostIds(
    postIds: string[],
  ): Promise<Map<string, NewestLike[]>> {
    const groups = await this.PostLikeModel.aggregate<{
      _id: string;
      likes: NewestLike[];
    }>([
      { $match: { postId: { $in: postIds }, status: LikeStatus.Like } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$postId',
          likes: {
            $push: {
              userId: '$userId',
              login: '$login',
              createdAt: '$createdAt',
            },
          },
        },
      },
      { $project: { likes: { $slice: ['$likes', NEWEST_LIKES_LIMIT] } } },
    ]);

    return new Map(groups.map((group) => [group._id, group.likes]));
  }

  async save(like: PostLikeDocument) {
    await like.save();
  }
}
