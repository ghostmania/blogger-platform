import { PostDocument } from '../../../domain/post.entity';
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

  /**
   * myStatus и newestLikes не хранятся в документе поста — их передаёт
   * query-repository, вычислив под конкретного пользователя на чтении.
   */
  static mapToView(
    post: PostDocument,
    myStatus: LikeStatus = LikeStatus.None,
    newestLikes: NewestLikeViewDto[] = [],
  ): PostViewDto {
    const dto = new PostViewDto();

    dto.id = post._id.toString();
    dto.title = post.title;
    dto.shortDescription = post.shortDescription;
    dto.content = post.content;
    dto.blogId = post.blogId;
    dto.blogName = post.blogName;
    dto.createdAt = post.createdAt;
    dto.extendedLikesInfo = {
      likesCount: post.extendedLikesInfo.likesCount,
      dislikesCount: post.extendedLikesInfo.dislikesCount,
      myStatus,
      newestLikes,
    };

    return dto;
  }
}
