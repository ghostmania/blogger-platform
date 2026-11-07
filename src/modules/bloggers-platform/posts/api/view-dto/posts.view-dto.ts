import { LikeStatus } from '../../../enums/like-status.enum';

//деталь одного лайка для newestLikes (последние 3 лайка со статусом Like)
export class NewestLikeViewDto {
  addedAt: string;
  userId: string;
  login: string;
}

export class PostViewDto {
  id: string;
  title: string;
  shortDescription: string;
  content: string;
  blogId: string;
  blogName: string;
  createdAt: Date;
  extendedLikesInfo: {
    likesCount: number;
    dislikesCount: number;
    myStatus: LikeStatus;
    newestLikes: NewestLikeViewDto[];
  };
}
